describe("dataNormalization utils", () => {
    const originalEnv = process.env;

    afterEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    test("normalizeEmail lowercases complete email", async () => {
        process.env = {
            ...originalEnv,
            PORT: "7050",
            HOSTING_DOMAIN_NAME: "localhost",
            USES_SSL: "0",
        };

        const { normalizeEmail } = await import("../src/services/utils/dataNormalization");
        expect(normalizeEmail("Alice.Smith+X@Example.COM")).toBe("alice.smith+x@example.com");
    });

    test("getApplicationDomainWithProtocol uses https when USES_SSL=1", async () => {
        process.env = {
            ...originalEnv,
            PORT: "7050",
            HOSTING_DOMAIN_NAME: "api.match-it.local",
            USES_SSL: "1",
        };

        const { getApplicationDomainWithProtocol, getApplicationDomain } = await import("../src/services/utils/dataNormalization");
        expect(getApplicationDomain()).toBe("api.match-it.local:7050");
        expect(getApplicationDomainWithProtocol()).toBe("https://api.match-it.local:7050");
    });

    test("getApplicationDomainWithProtocol(forceNoSSL) forces http", async () => {
        process.env = {
            ...originalEnv,
            PORT: "7050",
            HOSTING_DOMAIN_NAME: "https://api.match-it.local",
            USES_SSL: "1",
        };

        const { getApplicationDomainWithProtocol } = await import("../src/services/utils/dataNormalization");
        expect(getApplicationDomainWithProtocol(true)).toBe("http://api.match-it.local:7050");
    });
});
