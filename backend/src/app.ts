import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import cookieParser from "cookie-parser"
import authRoutes from "./modules/auth/routes/auth.routes.js"
import userRoutes from "./modules/users/routes/user.routes.js"
import workerRoutes from "./modules/workers/routes/worker.routes.js";
import locationRoutes from "./modules/location/routes/location.routes.js"
import providerRoutes from "./modules/providers/routes/provider.routes.js";
import skillRoutes from "./modules/skills/routes/skill.routes.js"
const app = express();


app.use(helmet())
app.use(cors())
app.use(morgan("dev"))
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use("/api/v1/auth",authRoutes)
app.use("/api/v1/users",userRoutes)
app.get("/api/v1/health",(_req,res)=>{
    res.status(200).json({
        success:true,
        message:"Server is running"
    })
})


app.use(
  "/api/v1/workers",
  workerRoutes
);
app.use(
  "/api/v1/location",
  locationRoutes
);

app.use(
  "/api/v1/providers",
  providerRoutes
);

app.use(
  "/api/v1/skills",
  skillRoutes
);




export default app;


