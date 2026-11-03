package com.bcp.workshop.auth;

import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthResourceLoginUnitTest {
    private static final String USERNAME = "test-user";
    private static final String PASSWORD = "test-password";
    private static final String ROLE = "STUDENT";
    private static final String DISPLAY_NAME = "Test User";
    private static final int EXPECTED_EXPIRES_IN = 3600;

    @Mock
    LegacyDatabase database;

    private AuthResource resource;

    @BeforeEach
    void setUp() {
        resource = new AuthResource();
        resource.database = database;
    }

    private static LoginRequest request(String username, String password) {
        LoginRequest request = new LoginRequest();
        request.username = username;
        request.password = password;
        return request;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> body(Response response) {
        return (Map<String, Object>) response.getEntity();
    }

    @Test
    void ca1_nullRequest_returns400RequestIsNull() {
        Response response = resource.login(null);

        assertEquals(400, response.getStatus());
        assertEquals("Request is null", body(response).get("message"));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void ca2_blankUsername_returns400UsernameRequired(String username) {
        Response response = resource.login(request(username, PASSWORD));

        assertEquals(400, response.getStatus());
        assertEquals("Username is required", body(response).get("message"));
        verify(database, never()).findByCredentials(anyString(), anyString());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void ca3_blankPassword_returns400PasswordRequired(String password) {
        Response response = resource.login(request(USERNAME, password));

        assertEquals(400, response.getStatus());
        assertEquals("Password is required", body(response).get("message"));
        verify(database, never()).findByCredentials(anyString(), anyString());
    }

    @Test
    void ca4_unknownCredentials_returns401() {
        when(database.findByCredentials(USERNAME, PASSWORD)).thenReturn(null);

        Response response = resource.login(request(USERNAME, PASSWORD));

        assertEquals(401, response.getStatus());
    }

    @Test
    @SuppressWarnings("unchecked")
    void ca5_validCredentials_returns200WithTokenExpirationAndUser() {
        when(database.findByCredentials(USERNAME, PASSWORD))
                .thenReturn(new UserRecord(1L, USERNAME, DISPLAY_NAME, ROLE));

        Response response = resource.login(request(USERNAME, PASSWORD));

        assertEquals(200, response.getStatus());
        Map<String, Object> body = body(response);
        assertFalse(((String) body.get("token")).isBlank());
        assertEquals(EXPECTED_EXPIRES_IN, body.get("expiresIn"));
        Map<String, Object> user = (Map<String, Object>) body.get("user");
        assertEquals(USERNAME, user.get("username"));
        assertEquals(DISPLAY_NAME, user.get("displayName"));
        assertEquals(ROLE, user.get("role"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void ca6_displayNameWithHtml_isReturnedEscaped() {
        when(database.findByCredentials(USERNAME, PASSWORD))
                .thenReturn(new UserRecord(1L, USERNAME, "<b>Ana</b>", ROLE));

        Response response = resource.login(request(USERNAME, PASSWORD));

        Map<String, Object> user = (Map<String, Object>) body(response).get("user");
        assertEquals("&lt;b&gt;Ana&lt;/b&gt;", user.get("displayName"));
    }

    @Test
    void ca7_unexpectedDatabaseError_returns500WithMessageAndException() {
        when(database.findByCredentials(USERNAME, PASSWORD)).thenThrow(new IllegalStateException("boom"));

        Response response = resource.login(request(USERNAME, PASSWORD));

        assertEquals(500, response.getStatus());
        assertEquals("boom", body(response).get("message"));
        assertEquals(IllegalStateException.class.getName(), body(response).get("exception"));
    }

    @Test
    void ca7_databaseErrorWithoutMessage_returns500WithUnknownError() {
        when(database.findByCredentials(USERNAME, PASSWORD)).thenThrow(new IllegalStateException());

        Response response = resource.login(request(USERNAME, PASSWORD));

        assertEquals(500, response.getStatus());
        assertEquals("Unknown error", body(response).get("message"));
        assertNotNull(body(response).get("exception"));
    }
}
