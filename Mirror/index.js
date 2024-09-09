let db;
let files = [];
let currentIndex = 0;
let ContentElement = [];

function openDB() {
    const request = indexedDB.open("fileDatabase", 1);

    request.onerror = function (event) {
        console.error("Database error:", event.target.errorCode);
    };

    request.onsuccess = function (event) {
        db = event.target.result;
        console.log("Database opened successfully");
        // Get the Contents from websocket

        const socket = new WebSocket('ws://localhost:8000/ws/mirror/?key=mirror1admin');

        // Listen for the connection to be established
        socket.onopen = function() {
            console.log('WebSocket connection established');
            // socket.send(JSON.stringify({
            //     'service': 'GetMyContents'
            // }));
        };

        // Listen for messages from the server
        socket.onmessage = function(event) {
            const data = JSON.parse(event.data);
            console.log('Message from server:', data);
            // data.data.map(data, index)
            console.log(data.data.service)
            if (data.data?.service === "GetMyContents"){

                // data.data.data.forEach((index, data)=>{
                //     // print(data._id)
                    console.log(data.data.data)
                    data.data.data.map((content)=>{
                        console.log(content._id)
                    saveFileFromUrl(content)

                    })

                // })
            }
            
        };

        

        // loadFiles(); // Load and preload files when DB is opened
    };

    request.onupgradeneeded = function (event) {
        db = event.target.result;
        const objectStore = db.createObjectStore("files", { keyPath: "id", autoIncrement: true });
        objectStore.createIndex("fileName", "fileName", { unique: false });
        console.log("Object store created successfully");
    };
}


function saveFileFromUrl(contentData) {
    const contentUrl = contentData.content_url;
    const fileName = contentUrl.split('/').pop(); // Extract filename from URL

    fetch(contentUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.blob(); // Convert the response to a Blob
        })
        .then(blob => {
            const transaction = db.transaction(["files"], "readwrite");
            const objectStore = transaction.objectStore("files");

            const fileData = {
                fileName: fileName,
                fileContent: blob, // Store the downloaded Blob content
                mirrorId: contentData.mirror_id,
                isActive: contentData.is_active,
                order: contentData.order
            };

            const request = objectStore.add(fileData);

            request.onsuccess = function (event) {
                console.log("File stored successfully with ID:", event.target.result);
                loadFiles(); // Reload files and preload them
            };

            request.onerror = function (event) {
                console.error("Error storing file:", event.target.errorCode);
            };
        })
        .catch(error => {
            console.error("Error downloading file:", error);
        });
}


function saveFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a file first");
        return;
    }

    const transaction = db.transaction(["files"], "readwrite");
    const objectStore = transaction.objectStore("files");

    const fileData = {
        fileName: file.name,
        fileContent: file
    };

    const request = objectStore.add(fileData);

    request.onsuccess = function (event) {
        console.log("File stored successfully with ID:", event.target.result);

        loadFiles(); // Reload files and preload them
    };

    request.onerror = function (event) {
        console.error("Error storing file:", event.target.errorCode);
    };
}

function loadFiles() {
    files = []; // Clear the existing list
    const transaction = db.transaction(["files"], "readonly");
    const objectStore = transaction.objectStore("files");

    objectStore.openCursor().onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
            // if (cursor.value.fileContent.type.startsWith('image/')) {
            files.push(cursor.value.fileContent);
            // }
            cursor.continue();
        } else {
            preloadFiles(); // Preload files before starting the slideshow
        }
    };
}

function preloadFiles() {
    const ContentPromise = [];
    files.forEach(file => {

        if (file.type === 'video/mp4') {

            const fileReader = new FileReader();
            const filePromise = new Promise((resolve, reject) => {
                fileReader.onload = function (e) {
                    const url = e.target.result;
                    const video = document.createElement('video');
                    video.src = url;
                    video.controls = false; // Hide controls
                    video.loop = false;
                    // video.style.maxWidth = '100%';
                    // video.style.maxHeight = '100%';
                    // video.style.width = "100%";
                    video.style.height = "100%";
                    video.preload = "auto"; // Load video content
                    ContentElement.push(video);

                    resolve();
                };
                fileReader.onerror = function (e) {
                    reject(e);
                };
                fileReader.readAsDataURL(file);
            });

            ContentPromise.push(filePromise);
        }

        else {
            const fileReader = new FileReader();
            const filePromise = new Promise((resolve, reject) => {
                fileReader.onload = function (e) {
                    const url = e.target.result;
                    const img = document.createElement('img');
                    img.src = url;
                    // img.style.maxWidth = '100%';
                    img.style.height = '100%';
                    img.style.width = "100%";
                    ContentElement.push(img);
                    resolve();
                };
                fileReader.onerror = function (e) {
                    reject(e);
                };
                fileReader.readAsDataURL(file);
            });

            ContentPromise.push(filePromise);
        }
    });

    Promise.all(ContentPromise).then(() => {
        showStartButton()
        // startSlideshow(); // Start the slideshow after preloading all files
    });
}


function showStartButton(){
    const startbutton = document.getElementById('startButton')
    const loadingText = document.getElementById('loadingText')
    startbutton.style.display = "flex";
    loadingText.style.display = "none";
}

function startSlideshow() {
    const slideshowContainer = document.getElementById('slideshowContainer');
    if (files.length === 0) {
        slideshowContainer.innerHTML = '<p>No files uploaded yet.</p>';
        return;
    }
    currentIndex = 0;
    showCurrentFile();
}





async function showCurrentFile() {
    const slideshowContainer = document.getElementById('slideshowContainer');
    slideshowContainer.innerHTML = ''; // Clear the current display
    // console.log(ContentElement)
    console.log(currentIndex)
    const content = ContentElement[currentIndex];
    // console.log(content.tagName)
    if (content.tagName == "VIDEO") {
        
        // Make sure user has interacted with the page
        content.play().then(() => {
            content.onended = function () {

                showCurrentFile();
            };
        }).catch(error => {
            console.error("Failed to play video:", error);
        });
        slideshowContainer.appendChild(content);

       // Delay of 2 seconds between images
    }
    else {
     
        setTimeout(() => {
            showCurrentFile(); // Call the function after a delay
        }, 4000);
        // showCurrentFile();
        slideshowContainer.appendChild(content);
 
   
    }
    console.log("index",currentIndex)

    console.log(ContentElement.length)
    currentIndex = currentIndex + 1

    if(ContentElement.length === currentIndex){
        console.log('reset')
        currentIndex = 0;
        await loadFiles()
    }


}

document.addEventListener('DOMContentLoaded', (event) => {
    openDB();
});


window.onbeforeunload = function() {
    // Close the database first (optional but recommended)
    if (db) {
        db.close();
    }
    
    // Delete the database
    const request = indexedDB.deleteDatabase("fileDatabase");

    request.onsuccess = function() {
        console.log("Database deleted successfully.");
    };

    request.onerror = function(event) {
        console.error("Error deleting database:", event.target.errorCode);
    };

    request.onblocked = function() {
        console.log("Database deletion is blocked.");
    };
};
