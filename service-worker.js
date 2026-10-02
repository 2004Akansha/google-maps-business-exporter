const LARAVEL_API_BASE =
    "http://127.0.0.1:8000";


console.log(
    "Laravel service worker loaded."
);


// ======================================================
// MESSAGE HANDLER
// ======================================================

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

        // --------------------------------------------------
        // IMPORT BUSINESS
        // --------------------------------------------------

        if (
            message.type ===
            "IMPORT_BUSINESS"
        ) {

            importBusinessToLaravel(
                message.payload
            )
                .then(result => {

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


        // --------------------------------------------------
        // LOAD EXTRACTION JOB
        // --------------------------------------------------

        if (
            message.type ===
            "GET_EXTRACTION_JOB"
        ) {

            getExtractionJob(
                message.jobId
            )
                .then(result => {

                    sendResponse({
                        success: true,
                        data: result
                    });

                })
                .catch(error => {

                    console.error(
                        "Failed to load extraction job:",
                        error
                    );

                    sendResponse({
                        success: false,
                        error: error.message
                    });

                });


            return true;
        }

    }
);


// ======================================================
// IMPORT BUSINESS
// ======================================================

async function importBusinessToLaravel(
    payload
) {

    console.log(
        "================================="
    );

    console.log(
        "Sending request from extension service worker"
    );

    console.log(
        "================================="
    );

    console.log(
        "Laravel URL:",
        `${LARAVEL_API_BASE}/api/import/business`
    );

    console.log(
        "Payload:",
        payload
    );


    const response =
        await fetch(
            `${LARAVEL_API_BASE}/api/import/business`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );


    // IMPORTANT:
    // Read response as text first.
    // This prevents JSON parsing from hiding
    // Laravel's actual error.

    const responseText =
        await response.text();


    console.log(
        "Laravel HTTP status:",
        response.status
    );

    console.log(
        "Laravel response:",
        responseText
    );


    let data = null;


    try {

        data =
            JSON.parse(
                responseText
            );

    } catch (error) {

        throw new Error(
            `Laravel returned non-JSON response. ` +
            `HTTP ${response.status}. ` +
            `Response: ${responseText.substring(0, 500)}`
        );

    }


    if (!response.ok) {

        throw new Error(
            data.message ||
            data.error ||
            `Laravel API returned HTTP ${response.status}`
        );

    }


    return data;
}


// ======================================================
// GET EXTRACTION JOB
// ======================================================

async function getExtractionJob(
    jobId
) {

    if (!jobId) {

        throw new Error(
            "Job ID is required."
        );

    }


    const url =
        `${LARAVEL_API_BASE}/api/extraction-jobs/${jobId}`;


    console.log(
        "Loading extraction job:",
        url
    );


    const response =
        await fetch(
            url,
            {
                method: "GET",

                headers: {
                    "Accept":
                        "application/json"
                }
            }
        );


    const responseText =
        await response.text();


    console.log(
        "Laravel job HTTP status:",
        response.status
    );

    console.log(
        "Laravel job response:",
        responseText
    );


    let data = null;


    try {

        data =
            JSON.parse(
                responseText
            );

    } catch (error) {

        throw new Error(
            `Laravel returned non-JSON response. ` +
            `HTTP ${response.status}. ` +
            `Response: ${responseText.substring(0, 500)}`
        );

    }


    if (!response.ok) {

        throw new Error(
            data.message ||
            data.error ||
            `Laravel returned HTTP ${response.status}`
        );

    }


    return data;
}