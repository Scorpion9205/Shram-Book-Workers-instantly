import { VerificationChannel } from "../types/verification.types.js";
export function getVerificationChannel(identifier) {
    if (identifier.includes("@")) {
        return VerificationChannel.EMAIL;
    }
    return VerificationChannel.SMS;
}
//# sourceMappingURL=identifier.util.js.map