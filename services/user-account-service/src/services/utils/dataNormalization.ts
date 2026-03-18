const applicationPort = +(process.env.PORT || 5500)
const domainName = process.env.HOSTING_DOMAIN_NAME || "localhost" // this could be moved to some utils service function
const usesSSL = (+(process.env.USES_SSL || 0) == 1)

/**
 * We are not distinguishing between lower/upper case in email first part as stated in RFC 5321 and RFC 5322 (domain name is domain )
*/
export function normalizeEmail(email: string) {
    return email.toLowerCase();
}

export function getApplicationDomainWithProtocol(forceNoSSL = false) : string {
    const domain = getApplicationDomain()
    const domainClear = domain.replace(/^https?:\/\//, '');

    if (forceNoSSL)
        return "http://" + domainClear

    const protocol = usesSSL ? "https://" : "http://";
    return protocol + domainClear
}

export function getApplicationDomain() : string {
    return `${domainName}:${applicationPort}`;
}