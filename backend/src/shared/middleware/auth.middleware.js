import "dotenv/config";
import jwt from "jsonwebtoken";
export const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Access Token required"
            });
        }
        if (!authHeader.startsWith("Bearer")) {
            return res.status(401).json({
                success: false,
                message: "Invalid token format"
            });
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ success: false, message: "Access Token required" });
        }
        const secret = process.env.JWT_ACCESS_SECRET;
        if (!secret) {
            return res.status(500).json({ success: false, message: "Server configuration error" });
        }
        const decoded = jwt.verify(token, secret);
        req.user = { userId: decoded.userId, role: decoded.role };
        next();
    }
    catch (error) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};
//# sourceMappingURL=auth.middleware.js.map