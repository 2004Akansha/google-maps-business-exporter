const LARAVEL_API_BASE = "http://127.0.0.1:8000";

console.log("Laravel service worker loaded.");


chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

        if (message.type !== "IMPORT_BUSINESS") {
            return;
        }

        importBusinessToLaravel(message.payload)
            .then(result => {

                console.log(
                    "Business imported successfully:",
                    result
                );

                sendResponse({
                    success: true,
                    data: result
                });

            })
            .catch(error => {

                console.error(
                    "Business import failed:",
                    error
                );

                sendResponse({
                    success: false,
                    error: error.message
                });

            });

        return true;
    }
);


async function importBusinessToLaravel(payload) {

    console.log(
        "Sending request from extension service worker:",
        payload
    );


    const response = await fetch(
        `${LARAVEL_API_BASE}/api/import/business`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(payload)
        }
    );


    const data = await response.json();


    console.log(
        "Laravel API response:",
        data
    );


    if (!response.ok) {

        throw new Error(
            data.message ||
            `Laravel API returned HTTP ${response.status}`
        );

    }


    return data;
}