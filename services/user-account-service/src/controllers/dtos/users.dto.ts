
/**
 * Dto for the users publicly available profile information (avoid placing sensitive data here -- no emails etc... this is friends API for)
 */
export interface UserProfileDto {
    uuid: string;
    name: string | null;
    avatarUrl: string | null;
}