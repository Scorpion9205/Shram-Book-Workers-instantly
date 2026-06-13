import { io } from "socket.io-client";
const socket = io("http://localhost:5000");

socket.on("connect", () => {

    console.log(
        "Connected:",
        socket.id
    );

});

socket.on(
    "instant_request_created",
    (data) => {

        console.log(
            "NEW REQUEST"
        );

        console.log(data);

    }
);

socket.on(
    "worker_accepted",
    (data) => {

        console.log(
            "WORKER ACCEPTED"
        );

        console.log(data);

    }
);