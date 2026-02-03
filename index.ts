import { connectDB } from "./src/config/database";
import app from "./src/app";

import { createServer } from "http";
import { initializeSocket } from "./src/utils/socket";


const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);

initializeSocket(httpServer);

connectDB()
.then(()=>{
    app.listen(PORT,()=>{
        console.log("SERVER isrunning on Port",PORT);
    })
})
.catch((error)=>{
    console.error("Failed to start the server", error);
    process.exit(1);
})
