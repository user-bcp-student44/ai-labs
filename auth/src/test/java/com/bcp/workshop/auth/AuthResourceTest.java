package com.bcp.workshop.auth;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.response.ValidatableResponse;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.CoreMatchers.nullValue;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
class AuthResourceTest {
    private static final String LOGIN_PATH = "/auth/login";

    private static ValidatableResponse login(String body) {
        return given()
                .contentType("application/json")
                .body(body)
                .when().post(LOGIN_PATH)
                .then();
    }

    @Test
    void logsInWithWorkshopUser() {
        given()
                .contentType("application/json")
                .body("{\"username\":\"student\",\"password\":\"Workshop123!\",\"client\":\"angular-workshop\"}")
                .when().post("/auth/login")
                .then()
                .statusCode(200)
                .body("user.username", is("student"))
                .body("token", notNullValue());
    }

    // Spec: "Successful login preserves its response contract" (student).
    @Test
    void studentLoginReturnsFullSuccessContract() {
        login("{\"username\":\"student\",\"password\":\"Workshop123!\"}")
                .statusCode(200)
                .body("token", not(emptyOrNullString()))
                .body("expiresIn", is(3600))
                .body("user.username", is("student"))
                .body("user.displayName", is("Workshop Student"))
                .body("user.role", is("STUDENT"));
    }

    // Spec: "Successful login preserves its response contract" (trainer).
    @Test
    void trainerLoginReturnsFullSuccessContract() {
        login("{\"username\":\"trainer\",\"password\":\"Trainer123!\"}")
                .statusCode(200)
                .body("token", not(emptyOrNullString()))
                .body("expiresIn", is(3600))
                .body("user.username", is("trainer"))
                .body("user.displayName", is("Workshop Trainer"))
                .body("user.role", is("TRAINER"));
    }

    // Protected contract: absent body is rejected with 400 "Request is null".
    @Test
    void rejectsMissingBody() {
        given()
                .contentType("application/json")
                .when().post(LOGIN_PATH)
                .then()
                .statusCode(400)
                .body("message", is("Request is null"));
    }

    // Protected contract: missing or blank username is rejected with 400.
    @Test
    void rejectsMissingUsername() {
        login("{\"password\":\"Workshop123!\"}")
                .statusCode(400)
                .body("message", is("Username is required"));
    }

    @Test
    void rejectsBlankUsername() {
        login("{\"username\":\"   \",\"password\":\"Workshop123!\"}")
                .statusCode(400)
                .body("message", is("Username is required"));
    }

    // Protected contract: missing or blank password is rejected with 400.
    @Test
    void rejectsMissingPassword() {
        login("{\"username\":\"student\"}")
                .statusCode(400)
                .body("message", is("Password is required"));
    }

    @Test
    void rejectsBlankPassword() {
        login("{\"username\":\"student\",\"password\":\"   \"}")
                .statusCode(400)
                .body("message", is("Password is required"));
    }

    // Protected contract: known user with a wrong password is 401 with no token.
    @Test
    void rejectsWrongPasswordForKnownUser() {
        login("{\"username\":\"student\",\"password\":\"not-the-password\"}")
                .statusCode(401)
                .body("token", nullValue());
    }

    // Protected contract: unknown user is 401 with no token.
    @Test
    void rejectsUnknownUser() {
        login("{\"username\":\"nobody\",\"password\":\"Workshop123!\"}")
                .statusCode(401)
                .body("token", nullValue());
    }

    // Protected contract: quote characters matching no user stay 401, never 500.
    @Test
    void rejectsQuoteCharactersWithoutServerError() {
        login("{\"username\":\"o'brien\",\"password\":\"it's\"}")
                .statusCode(401)
                .body("token", nullValue());
    }

    // Spec: "Query-altering username" must not authenticate.
    @Test
    void rejectsQueryAlteringUsername() {
        login("{\"username\":\"' OR '1'='1\",\"password\":\"arbitrary\"}")
                .statusCode(401)
                .body("token", nullValue());
    }

    // Spec: "Query-altering password" must not authenticate.
    @Test
    void rejectsQueryAlteringPassword() {
        login("{\"username\":\"student\",\"password\":\"' OR '1'='1\"}")
                .statusCode(401)
                .body("token", nullValue());
    }
}
