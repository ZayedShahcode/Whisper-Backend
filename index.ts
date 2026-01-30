import { connectDB } from "./src/config/database";
import app from "./src/app";


const PORT = process.env.PORT || 3000;

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
