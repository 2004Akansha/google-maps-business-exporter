// ======================================================
// GOOGLE MAPS BUSINESS EXPORTER - popup.js
// ======================================================


// ======================================================
// FUNCTION: Normalize Maps URL
// ======================================================

function normalizeMapsUrl(url) {

    if (!url) {
        return "";
    }

    try {

        const parsedUrl = new URL(url);

        return (
            parsedUrl.origin +
            parsedUrl.pathname
        );

    } catch (error) {

        console.warn( 
            "Failed to normalize Maps URL:", 
            error 
        );

        return url;

    }

}


// ======================================================
// FUNCTION: Remove duplicate businesses
// ======================================================

function removeDuplicates(businesses) {

    const seen = new Set();

    return businesses.filter(business => {

        if (!business) {
            return false;
        }

        let identifier = "";

        // --------------------------------------------------
        // Prefer Maps URL
        // --------------------------------------------------

        if (business.mapsUrl) {

            identifier =
                normalizeMapsUrl(
                    business.mapsUrl
                );

        }

        // --------------------------------------------------
        // Fallback to business name
        // --------------------------------------------------

        if (!identifier && business.name) {

            identifier =
                business.name
                    .trim()
                    .toLowerCase();

        }

        // --------------------------------------------------
        // Ignore invalid records
        // --------------------------------------------------

        if (!identifier) {
            return false;
        }

        // --------------------------------------------------
        // Check duplicate
        // --------------------------------------------------

        if (seen.has(identifier)) {
            return false;
        }

        seen.add(identifier);

        return true;

    });

}


// ======================================================
// FUNCTION: Update business count
// ======================================================

function updateBusinessCount() {
     chrome.storage.local.get( 
        ["businesses"], 
        (result) => { 
            const businesses =
                result.businesses || []; 
                
            const countElement = 
                document.getElementById("count"); 
                
            if (countElement) { 
                
                countElement.textContent = 
                     "Businesses collected: " + 
                      businesses.length;
            }
        }
    );
}


// ======================================================
// LOAD STORED BUSINESSES WHEN POPUP OPENS
// ======================================================

chrome.storage.local.get(
    ["businesses"],
    (result) => {

        const businesses =
            result.businesses || [];

        const countElement =
            document.getElementById("count");

        if (countElement) {
            countElement.textContent = 
                "Businesses collected: " + 
                 businesses.length; 
        }

        console.log(
            "Stored businesses:",
            businesses
        );

    }
);


// ======================================================
// FUNCTION: Download CSV
// ======================================================

function downloadCSV(csv) {

    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        "google_maps_businesses.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

}


// ======================================================
// EXPORT CSV BUTTON
// ======================================================

document.getElementById("export").addEventListener(
    "click",
    () => {

        console.log(
            "Export CSV button clicked."
        );

        chrome.storage.local.get(
            ["businesses"],
            (result) => {

                const businesses =
                    result.businesses || [];

                console.log(
                    "Businesses available for export:",
                    businesses
                );

                if (businesses.length === 0) {

                    document.getElementById(
                        "status"
                    ).textContent =
                        "No businesses available to export.";

                    return;

                }

                // --------------------------------------------------
                // Convert to CSV
                // --------------------------------------------------

                const csv =
                    convertToCSV(
                        businesses
                    );

                console.log(
                    "CSV created successfully."
                );

                // --------------------------------------------------
                // Download
                // --------------------------------------------------

                downloadCSV(csv);

                document.getElementById(
                    "status"
                ).textContent =
                    "CSV exported successfully.";

            }
        );

    }
);


// ======================================================
// CLEAR DATA BUTTON
// ======================================================

document.getElementById("clear").addEventListener(
    "click",
    () => {

        console.log(
            "Clear Data button clicked."
        );

        chrome.storage.local.remove(
            [
                "businesses",
                "mapResultsChanged"
            ],
            () => {

                if (
                    chrome.runtime.lastError
                ) {

                    console.error(
                        "Clear data error:",
                        chrome.runtime.lastError.message
                    );

                    document.getElementById(
                        "status"
                    ).textContent =
                        "Failed to clear data.";

                    return;

                }

                // --------------------------------------------------
                // Update UI
                // --------------------------------------------------

                document.getElementById(
                    "count"
                ).textContent =
                    "Businesses collected: 0";

                document.getElementById(
                    "status"
                ).textContent =
                    "Data cleared successfully.";

                document.getElementById(
                    "progress"
                ).textContent =
                    "";

                console.log(
                    "All stored businesses cleared."
                );

            }
        );

    }
);

// ======================================================
// START AUTOMATIC GOOGLE MAPS SEARCH
// ======================================================

document.getElementById(
    "startSearch"
).addEventListener(
    "click",
    async () => {

        const businessType =
            document.getElementById(
                "businessType"
            ).value.trim();

        const city =
            document.getElementById(
                "city"
            ).value.trim();


        // --------------------------------------------------
        // Validate business type
        // --------------------------------------------------

        if (!businessType) {

            document.getElementById(
                "status"
            ).textContent =
                "Please select a business type.";

            return;

        }


        // --------------------------------------------------
        // Validate city
        // --------------------------------------------------

        if (!city) {

            document.getElementById(
                "status"
            ).textContent =
                "Please enter a city.";

            return;

        }


        // --------------------------------------------------
        // Automatically create search query
        // --------------------------------------------------

        const searchQuery =
            businessType +
            " in " +
            city;


        console.log(
            "Automatic search query:",
            searchQuery
        );


        // --------------------------------------------------
        // Create Google Maps search URL
        // --------------------------------------------------

        const mapsUrl =
            "https://www.google.com/maps/search/" +
            encodeURIComponent(
                searchQuery
            );


        console.log(
            "Opening Google Maps:",
            mapsUrl
        );


        // --------------------------------------------------
        // Update status
        // --------------------------------------------------

        document.getElementById(
            "status"
        ).textContent =
            "Opening Google Maps and starting automatic collection...";


        // --------------------------------------------------
        // Open Google Maps with search already performed
        // --------------------------------------------------

        try {

            await chrome.tabs.create({
                url: mapsUrl
            });


            document.getElementById(
                "status"
            ).textContent =
                "Google Maps search started. Automatic collection is active.";


        } catch (error) {

            console.error(
                "Failed to open Google Maps:",
                error
            );


            document.getElementById(
                "status"
            ).textContent =
                "Failed to open Google Maps.";

        }

    }
);

// ======================================================
// CLOSE POPUP BUTTON
// ======================================================

document.getElementById("closePopup").addEventListener(
    "click",
    () => {

        window.close();

    }
);

// ======================================================
// LARAVEL EXTRACTION CONFIGURATION
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {

    const jobIdInput = document.getElementById("jobId");
    const sourceIdInput = document.getElementById("sourceId");
    const saveConfigButton = document.getElementById("saveConfig");
    const configStatus = document.getElementById("configStatus");


    // Make sure the Laravel section exists
    if (
        !jobIdInput ||
        !sourceIdInput ||
        !saveConfigButton ||
        !configStatus
    ) {
        console.warn(
            "Laravel extraction configuration elements not found."
        );

        return;
    }


    // --------------------------------------------------
    // Load previously saved configuration
    // --------------------------------------------------

    const result = await chrome.storage.local.get(
        ["extractionConfig"]
    );


    if (result.extractionConfig) {

        jobIdInput.value =
            result.extractionConfig.jobId || "";

        sourceIdInput.value =
            result.extractionConfig.sourceId || "";

    }


    // --------------------------------------------------
    // Save configuration
    // --------------------------------------------------

    saveConfigButton.addEventListener(
        "click",
        async () => {

            const jobId =
                Number(jobIdInput.value);

            const sourceId =
                Number(sourceIdInput.value);


            if (!jobId || !sourceId) {

                configStatus.textContent =
                    "Please enter valid Job ID and Source ID.";

                configStatus.style.color = "red";

                return;
            }


            await chrome.storage.local.set({

                extractionConfig: {
                    jobId: jobId,
                    sourceId: sourceId
                }

            });


            configStatus.textContent =
                `Saved successfully — Job ${jobId}, Source ${sourceId}`;

            configStatus.style.color = "green";


            console.log(
                "Laravel extraction configuration saved:",
                {
                    jobId,
                    sourceId
                }
            );

        }
    );

});
// ======================================================
// TEST LARAVEL CONNECTION
// ======================================================

document.getElementById("testLaravel").addEventListener(
    "click",
    async () => {

        const jobId =
            Number(
                document.getElementById("jobId").value
            );

        const sourceId =
            Number(
                document.getElementById("sourceId").value
            );

        const status =
            document.getElementById(
                "laravelTestStatus"
            );


        // --------------------------------------------------
        // Validate configuration
        // --------------------------------------------------

        if (!jobId || !sourceId) {

            status.textContent =
                "Please enter and save Job ID and Source ID first.";

            status.style.color = "red";

            return;
        }


        // --------------------------------------------------
        // Show testing status
        // --------------------------------------------------

        status.textContent =
            "Testing Laravel connection...";

        status.style.color = "orange";


        console.log(
            "Testing Laravel from popup...",
            {
                jobId,
                sourceId
            }
        );


        // --------------------------------------------------
        // Create test business
        // --------------------------------------------------

        const testBusiness = {

            id:
                "popup-test-" +
                Date.now(),

            name:
                "Popup Test Restaurant",

            category:
                "Restaurant",

            address:
                "Nagpur, Maharashtra",

            phone:
                "9876543210",

            website:
                "https://example.com",

            rating:
                4.5,

            reviews:
                25,

            mapsUrl:
                "https://www.google.com/maps/"
        };


        // --------------------------------------------------
        // Create test review
        // --------------------------------------------------

        const testReviews = [

            {

                id:
                    "popup-review-" +
                    Date.now(),

                author:
                    "Popup Test User",

                rating:
                    5,

                date:
                    "2026-09-20",

                text:
                    "Testing Laravel integration from extension popup.",

                ownerResponse:
                    null

            }

        ];


        // --------------------------------------------------
        // Create test photo
        // --------------------------------------------------

        const testPhotos = [

            {

                id:
                    "popup-photo-" +
                    Date.now(),

                url:
                    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4"

            }

        ];


        // --------------------------------------------------
        // Send to service worker
        // --------------------------------------------------

        try {

            const response =
                await chrome.runtime.sendMessage({

                    type:
                        "IMPORT_BUSINESS",

                    payload: {

                        job_id:
                            jobId,

                        source_id:
                            sourceId,

                        business: {

                            name:
                                testBusiness.name,

                            category:
                                testBusiness.category,

                            address:
                                testBusiness.address,

                            phone:
                                testBusiness.phone,

                            website:
                                testBusiness.website,

                            rating:
                                testBusiness.rating,

                            review_count:
                                testBusiness.reviews,

                            maps_url:
                                testBusiness.mapsUrl,

                            external_id:
                                testBusiness.id

                        },

                        reviews:
                            testReviews.map(review => ({

                                external_review_id:
                                    review.id,

                                author:
                                    review.author,

                                rating:
                                    review.rating,

                                review_date:
                                    review.date,

                                review_text:
                                    review.text,

                                owner_response:
                                    review.ownerResponse,

                                source_url:
                                    testBusiness.mapsUrl

                            })),

                        photos:
                            testPhotos.map(photo => ({

                                photo_key:
                                    photo.id,

                                photo_url:
                                    photo.url,

                                photo_type:
                                    "business",

                                source_url:
                                    testBusiness.mapsUrl

                            }))

                    }

                });


            // --------------------------------------------------
            // No response
            // --------------------------------------------------

            if (!response) {

                throw new Error(
                    "No response received from service worker."
                );

            }


            // --------------------------------------------------
            // Laravel returned an error
            // --------------------------------------------------

            if (!response.success) {

                throw new Error(
                    response.error ||
                    "Laravel import failed."
                );

            }


            // --------------------------------------------------
            // Success
            // --------------------------------------------------

            console.log(
                "Laravel test successful:",
                response.data
            );


            status.textContent =
                "✅ Laravel connection successful!";

            status.style.color = "green";


            document.getElementById(
                "status"
            ).textContent =
                "Test business imported into Laravel.";


            console.log(
                "Laravel response:",
                response.data
            );


        } catch (error) {

            console.error(
                "Laravel popup test failed:",
                error
            );


            status.textContent =
                "❌ Laravel connection failed: " +
                error.message;

            status.style.color = "red";

        }

    }
);