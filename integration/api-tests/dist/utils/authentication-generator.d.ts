export declare enum UserPrivileges {
    NORMAL = "NORMAL",
    ADMIN = "ADMIN",
    TESTER = "TESTER"
}
export declare const generateAccessToken: (userUUID: string, userEmail: string, privilidge: string) => string;
