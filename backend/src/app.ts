import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import cookieParser from "cookie-parser"
import authRoutes from "./modules/auth/routes/auth.routes.js"
const app = express();

app.use(helmet())
app.use(cors())
app.use(morgan("dev"))
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use("/api/v1/auth",authRoutes)

app.get("/api/v1/health",(_req,res)=>{
    res.status(200).json({
        success:true,
        message:"Server is running"
    })
})
export default app;

app.get("/",(_req,res)=>{
    res.send("backend Working")
})
