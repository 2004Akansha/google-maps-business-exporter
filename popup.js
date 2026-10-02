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
                    .toLowerCase()
                    .replace(/\s+/g, " ");

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
    "startExtraction"
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


        const status =
            document.getElementById(
                "status"
            );


        // --------------------------------------------------
        // Get saved Laravel configuration
        // --------------------------------------------------

        const result =
            await chrome.storage.local.get(
                ["extractionConfig"]
            );


        const extractionConfig =
            result.extractionConfig;


        if (!extractionConfig) {

            status.textContent =
                "Please load a Laravel Job first.";

            status.style.color =
                "red";

            return;

        }


        if (!extractionConfig.jobId) {

            status.textContent =
                "Invalid Laravel Job.";

            status.style.color =
                "red";

            return;

        }


        // --------------------------------------------------
        // Validate city
        // --------------------------------------------------

        if (!city) {

            status.textContent =
                "Please enter a city.";

            status.style.color =
                "red";

            return;

        }


        // --------------------------------------------------
        // Create search query
        // --------------------------------------------------

        const searchQuery =
            businessType +
            " in " +
            city;


        // --------------------------------------------------
        // Save final extraction configuration
        // --------------------------------------------------

        await chrome.storage.local.set({

        extractionConfig: {

            ...extractionConfig,

            searchQuery:
                searchQuery,

            collectBusinessDetails:
                document.getElementById(
                    "collectBusinessDetails"
                ).checked,

            collectReviews:
                document.getElementById(
                    "collectReviews"
                ).checked,

            collectFullReviews:
                document.getElementById(
                    "collectFullReviews"
                ).checked,

            collectPhotos:
                document.getElementById(
                    "collectPhotos"
                ).checked

        }

    });


        console.log(
            "Starting extraction:",
            searchQuery,
            extractionConfig
        );


        // --------------------------------------------------
        // Open Google Maps
        // --------------------------------------------------

        const mapsUrl =
            "https://www.google.com/maps/search/" +
            encodeURIComponent(
                searchQuery
            );


        status.textContent =
            "Opening Google Maps...";

        status.style.color =
            "green";


        try {

            await chrome.tabs.create({
                url: mapsUrl
            });


            status.textContent =
                "Google Maps opened. Extraction started.";


        } catch (error) {

            console.error(
                "Failed to open Google Maps:",
                error
            );


            status.textContent =
                "Failed to open Google Maps.";

            status.style.color =
                "red";

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
// LOAD LARAVEL EXTRACTION JOB
// ======================================================

document.getElementById(
    "loadJob"
).addEventListener(
    "click",
    async () => {

        const jobId =
            Number(
                document.getElementById(
                    "jobId"
                ).value
            );


        const jobStatus =
            document.getElementById(
                "jobStatus"
            );


        if (!jobId) {

            jobStatus.textContent =
                "Please enter a valid Job ID.";

            jobStatus.style.color =
                "red";

            return;
        }


        jobStatus.textContent =
            "Loading job...";

        jobStatus.style.color =
            "orange";


        try {

            const response =
                await chrome.runtime.sendMessage({

                    type:
                        "GET_EXTRACTION_JOB",

                    jobId:
                        jobId

                });


            if (
                !response ||
                !response.success
            ) {

                throw new Error(
                    response?.error ||
                    "Failed to load extraction job."
                );

            }


            const job =
                response.data.data;


            console.log(
                "Loaded Laravel job:",
                job
            );


            // --------------------------------------------------
            // Save job configuration
            // --------------------------------------------------

            await chrome.storage.local.set({

                extractionConfig: {

                    jobId:
                        job.id,

                    sourceId:
                        job.source_id,

                    searchQuery:
                        job.search_query,

                    collectBusinessDetails:
                        job.collect_business_details === true,

                    collectReviews:
                       job.collect_reviews === true,

                    collectFullReviews:
                         job.collect_full_reviews === true,

                    collectPhotos:
                         job.collect_photos === true

                }

            });


            // --------------------------------------------------
            // Update UI
            // --------------------------------------------------

            document.getElementById(
                "sourceName"
            ).textContent =
                job.source_name || "-";


            document.getElementById(
                "jobSearchQuery"
            ).textContent =
                job.search_query || "-";


            document.getElementById(
                "collectBusinessDetails"
            ).checked =
                job.collect_business_details === true;


            document.getElementById(
                "collectReviews"
            ).checked =
                job.collect_reviews === true;

            document.getElementById(
                "collectFullReviews"
            ).checked =
                job.collect_full_reviews === true;

            document.getElementById(
                "collectPhotos"
            ).checked =
                job.collect_photos === true;

            updateFullReviewsState();

            jobStatus.textContent =
                `✓ Job ${job.id} loaded successfully.`;

            jobStatus.style.color =
                "green";


        } catch (error) {

            console.error(
                "Load job error:",
                error
            );


            jobStatus.textContent =
                "❌ " +
                error.message;

            jobStatus.style.color =
                "red";

        }

    }
);

// ======================================================
// FULL REVIEWS DEPENDS ON REVIEWS
// ======================================================

const collectReviewsCheckbox =
    document.getElementById(
        "collectReviews"
    );

const collectFullReviewsCheckbox =
    document.getElementById(
        "collectFullReviews"
    );


function updateFullReviewsState() {

    if (!collectReviewsCheckbox ||
        !collectFullReviewsCheckbox) {

        return;
    }

    collectFullReviewsCheckbox.disabled =
        !collectReviewsCheckbox.checked;

    if (!collectReviewsCheckbox.checked) {

        collectFullReviewsCheckbox.checked =
            false;

    }

}


if (collectReviewsCheckbox &&
    collectFullReviewsCheckbox) {

    collectReviewsCheckbox.addEventListener(
        "change",
        updateFullReviewsState
    );

    updateFullReviewsState();

}