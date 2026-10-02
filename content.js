// ======================================================
// GOOGLE MAPS BUSINESS EXPORTER - content.js
// ======================================================

console.log(
    "Google Maps Business Exporter loaded."
);

// ======================================================
// LARAVEL EXTRACTION CONFIGURATION
// ======================================================

let extractionConfig = {
    jobId: null,
    sourceId: null,
    collectReviews: true,
    collectFullReviews: false
};

// ======================================================
// FUNCTION: Normalize Maps URL
// ======================================================

function normalizeMapsUrl(url) {

    if (!url) {
        return "";
    }

    try {

        const parsedUrl =
            new URL(url);

        return (
            parsedUrl.origin +
            parsedUrl.pathname
        );

    } catch (error) {

        return url;

    }

}

// ======================================================
// FUNCTION: Get unique business key
// ======================================================

function getBusinessKey(business) {

    if (!business) {
        return "";
    }


    // --------------------------------------------------
    // Prefer Google Maps URL
    // --------------------------------------------------

    if (business.mapsUrl) {

        const normalizedUrl =
            normalizeMapsUrl(
                business.mapsUrl
            );

        if (normalizedUrl) {
            return normalizedUrl;
        }

    }


    // --------------------------------------------------
    // Fallback: name + address
    // --------------------------------------------------

    const name =
        (business.name || "")
            .trim()
            .toLowerCase();

    const address =
        (business.address || "")
            .trim()
            .toLowerCase();


    if (
        name &&
        address
    ) {

        return (
            "name-address:" +
            name +
            "|" +
            address
        );

    }


    // --------------------------------------------------
    // Last fallback: name only
    // --------------------------------------------------

    if (name) {

        return (
            "name:" +
            name
        );

    }


    return "";

}

function uniqueStrings(values = []) {

    const result = new Set();

    for (const value of values) {

        if (!value) {
            continue;
        }

        const cleaned =
            String(value)
                .trim();

        if (cleaned) {
            result.add(cleaned);
        }

    }

    return [
        ...result
    ];

}
function uniqueComments(comments = []) {

    const reviewMap = new Map();

    for (const comment of comments) {

        if (!comment) {
            continue;
        }

        // ================================================
        // New structured review object
        // ================================================

        if (
            typeof comment === "object" &&
            comment.id
        ) {

            const id =
                String(comment.id).trim();

            if (!id) {
                continue;
            }

            reviewMap.set(
                id,
                {
                    ...comment,
                    id: id
                }
            );

            continue;
        }

        // ================================================
        // Backward compatibility with old string comments
        // ================================================

        if (
            typeof comment === "string"
        ) {

            const text =
                comment.trim();

            if (!text) {
                continue;
            }

            const fallbackId =
                "text:" + text;

            if (
                !reviewMap.has(fallbackId)
            ) {

                reviewMap.set(
                    fallbackId,
                    {
                        id: fallbackId,
                        author: null,
                        rating: null,
                        date: null,
                        text: text,
                        ownerResponse: null
                    }
                );

            }

        }

    }

    return [
        ...reviewMap.values()
    ];
}

function cleanPhone(value) {

    if (!value) {
        return "";
    }

    return String(value)
        .replace(/^phone\s*:\s*/i, "")
        .replace(/\s+/g, " ")
        .trim();

}

function cleanGoogleMapsAddress(value) {

    if (!value) {
        return "";
    }

    let address = String(value)
        .replace(/\s+/g, " ")
        .trim();

    // Remove "Address:" prefix if Google provides it
    address = address.replace(
        /^address\s*:\s*/i,
        ""
    );

    // Remove Google Maps business status
    //
    // Examples:
    // Open, Closes 7 pm
    // Open, Closes 11:30 pm
    // Closed, Opens Monday at 9 am
    // Open · Closes 7 pm
    // Closed · Opens Monday at 9 am

    address = address
        .replace(
            /\s*(?:,|·)\s*Open\s*(?:,|·)\s*Closes.*$/i,
            ""
        )
        .replace(
            /\s*(?:,|·)\s*Closed\s*(?:,|·)\s*Opens.*$/i,
            ""
        )
        .replace(
            /\s*(?:,|·)\s*Open\s*$/i,
            ""
        )
        .replace(
            /\s*(?:,|·)\s*Closed\s*$/i,
            ""
        );

    return address.trim();
}

function extractPhone(card) {

    if (!card) {
        return "";
    }

    // ==================================================
    // 1. Direct tel link
    // ==================================================

    const phoneLink =
        card.querySelector(
            'a[href^="tel:"]'
        );

    if (phoneLink) {

        const href =
            phoneLink.getAttribute("href") || "";

        const phone =
            cleanPhone(
                href.replace(
                    /^tel:/i,
                    ""
                )
            );

        if (phone) {
            return phone;
        }

    }


    // ==================================================
    // 2. Google Maps phone data-item-id
    // ==================================================

    const phoneElements =
        card.querySelectorAll(
            '[data-item-id^="phone:"]'
        );

    for (const element of phoneElements) {

        const aria =
            element.getAttribute(
                "aria-label"
            ) || "";

        const text =
            element.innerText?.trim() || "";

        const phone =
            cleanPhone(
                aria || text
            );

        if (phone) {
            return phone;
        }

    }


    // ==================================================
    // 3. Any phone aria-label
    // ==================================================

    const phoneAriaElements =
        card.querySelectorAll(
            '[aria-label*="Phone" i]'
        );

    for (const element of phoneAriaElements) {

        const aria =
            element.getAttribute(
                "aria-label"
            ) || "";

        const text =
            element.innerText?.trim() || "";

        const phone =
            cleanPhone(
                aria || text
            );

        if (phone) {
            return phone;
        }

    }


    // ==================================================
    // 4. Card text fallback
    // ==================================================

    const cardText =
        card.innerText || "";

    const phonePatterns = [

        /\+\d{1,3}[\s-]?\d{5,14}/,

        /\(\d{2,5}\)[\s-]?\d{3,5}[\s-]?\d{3,5}/,

        /\b\d{10}\b/,

        /\b\d{3,5}[\s-]\d{3,5}[\s-]\d{3,5}\b/

    ];


    for (const pattern of phonePatterns) {

        const match =
            cardText.match(pattern);

        if (match) {

            return match[0].trim();

        }

    }


    return "";

}

function extractWebsite(card) {

    if (!card) {
        return "";
    }


    // ==================================================
    // 1. Google Maps authority link
    // ==================================================

    const authorityLink =
        card.querySelector(
            'a[data-item-id="authority"]'
        );

    if (authorityLink) {

        const href =
            authorityLink.href || "";

        if (
            isValidBusinessWebsite(href)
        ) {

            return cleanWebsiteUrl(href);

        }

    }


    // ==================================================
    // 2. Other valid links
    // ==================================================

    const links =
        card.querySelectorAll(
            "a[href]"
        );

    for (const link of links) {

        const href =
            link.href || "";

        if (
            isValidBusinessWebsite(href)
        ) {

            return cleanWebsiteUrl(href);

        }

    }


    return "";

}

function isValidBusinessWebsite(url) {

    if (!url) {
        return false;
    }


    if (
        url.startsWith("tel:") ||
        url.startsWith("mailto:")
    ) {

        return false;

    }


    if (
        !url.startsWith("http://") &&
        !url.startsWith("https://")
    ) {

        return false;

    }


    try {

        const parsed =
            new URL(url);

        const hostname =
            parsed.hostname.toLowerCase();


        const blockedHosts = [

            "google.com",
            "google.co.in",
            "googleusercontent.com",
            "gstatic.com",
            "googleapis.com"

        ];


        if (
            blockedHosts.some(
                host =>
                    hostname === host ||
                    hostname.endsWith("." + host)
            )
        ) {

            return false;

        }


        return true;

    } catch (error) {

        return false;

    }

}

function cleanWebsiteUrl(url) {

    try {

        const parsed =
            new URL(url);

        return parsed.href;

    } catch (error) {

        return url;

    }

}


// ======================================================
// FUNCTION: Extract visible businesses
// ======================================================

function extractBusinesses() {

    const businesses = [];

    const results =
        document.querySelectorAll(
            'div[role="article"]'
        );

    console.log(
        "Business result cards found:",
        results.length
    );


    results.forEach(
        (card, index) => {

            console.log(
                "Processing result:",
                index + 1
            );


            // ==================================================
            // NAME
            // ==================================================

            const nameElement =
                card.querySelector(
                    ".qBF1Pd"
                );

            const name =
                nameElement
                    ? nameElement.innerText.trim()
                    : "";


            // ==================================================
            // CATEGORY + ADDRESS
            // ==================================================

            let category = "";
            let address = "";

            const infoElements =
                card.querySelectorAll(
                    ".W4Efsd"
                );


            if (
                infoElements.length >= 2
            ) {

                const infoText =
                    infoElements[1]
                        .innerText
                        .trim();


                const parts =
                    infoText
                        .split("·")
                        .map(part => part.trim())
                        .filter(Boolean);

                console.log(
                    "RAW INFO TEXT:",
                    infoText
                );

                console.log(
                    "ADDRESS PARTS:",
                    parts
                );


                // First part is the category
                if (parts.length >= 1) {

                    category =
                        parts[0];

                }


                // Everything after the category
                // is treated as part of the address.
                if (parts.length >= 2) {

                    address =
                        parts
                            .slice(1)
                            .join(", ");

                    address =
                        cleanGoogleMapsAddress(
                            address
                        );

                     console.log(
                        "FINAL CLEAN ADDRESS:",
                        address
                    );


                }

            }


            // ==================================================
            // RATING + REVIEWS
            // ==================================================

            let rating = "";
            let reviews = "";

            const ratingElement =
                card.querySelector(
                    '[role="img"][aria-label*="stars"]'
                );


            if (ratingElement) {

                const ratingText =
                    ratingElement.getAttribute(
                        "aria-label"
                    );


                if (ratingText) {

                    const ratingMatch =
                        ratingText.match(
                            /([\d.]+)\s*stars/i
                        );


                    if (ratingMatch) {

                        rating =
                            ratingMatch[1];

                    }


                    const reviewsMatch =
                        ratingText.match(
                            /([\d,]+)\s*Reviews?/i
                        );


                    if (reviewsMatch) {

                        reviews =
                            reviewsMatch[1]
                                .replace(
                                    /,/g,
                                    ""
                                );

                    }

                }

            }


            // ==================================================
            // GOOGLE MAPS URL
            // ==================================================

            const linkElement =
                card.querySelector(
                    'a[href*="/maps/place/"]'
                );


            const mapsUrl =
                linkElement
                    ? linkElement.href
                    : "";

            // ==================================================
            // PHONE NUMBER
            // ==================================================

            const phone =
                extractPhone(card);


            // ==================================================
            // WEBSITE
            // ==================================================

            const website =
                extractWebsite(card);

            // ==================================================
            // CREATE BUSINESS OBJECT
            // ==================================================

            if (name) {

                const business = {

                    name:
                        name,

                    category:
                        category,

                    address:
                        cleanGoogleMapsAddress(address),

                    phone:
                        phone,

                    website:
                        website,

                    rating:
                        rating,

                    reviews:
                        reviews,

                    mapsUrl:
                        mapsUrl,

                    comments: [],

                    photoLinks: [],

                    photosUrl: "",

                    commentsCollected:
                        false,

                    photosCollected:
                        false

                };


                businesses.push(
                    business
                );


                console.log(
                    "Business extracted:",
                    business
                );

            }

        }
    );


    console.log(
        "FINAL EXTRACTED BUSINESSES:",
        businesses
    );


    return businesses;

}

// ======================================================
// MAP RESULTS CHANGE WATCHER
// ======================================================

let watcherInterval = null;

let mutationObserver = null;

let lastBusinessSignature = "";

let lastMapsView = "";

// Timer used only for checking DOM/result changes
let resultCheckTimeout = null;

// Timer used only for scheduling automatic scanning
let automaticScanTimeout = null;

// Prevent duplicate automatic scans
let autoScanRunning = false;
let automaticScanScheduled = false;
let detailExtractionRunning = false;

let mapInteractionTimeout = null;

let lastDetectedMapView = "";

let mapInteractionInProgress = false;

let isAutomaticScrolling = false;

// ======================================================
// FUNCTION: Get visible business signature
// ======================================================

function getVisibleBusinessSignature() {

    const cards =
        document.querySelectorAll(
            'div[role="article"]'
        );


    const identifiers = [];


    cards.forEach(
        (card) => {

            // --------------------------------------------------
            // Maps URL
            // --------------------------------------------------

            const link =
                card.querySelector(
                    'a[href*="/maps/place/"]'
                );


            if (
                link &&
                link.href
            ) {

                const normalizedUrl =
                    normalizeMapsUrl(
                        link.href
                    );


                if (normalizedUrl) {

                    identifiers.push(
                        normalizedUrl
                    );

                }

                return;

            }


            // --------------------------------------------------
            // Business name fallback
            // --------------------------------------------------

            const nameElement =
                card.querySelector(
                    ".qBF1Pd"
                );


            if (nameElement) {

                const name =
                    nameElement.innerText
                        .trim()
                        .toLowerCase();


                if (name) {

                    identifiers.push(
                        "name:" + name
                    );

                }

            }

        }
    );


    const uniqueIdentifiers =
        [...new Set(identifiers)];


    return uniqueIdentifiers
        .sort()
        .join("|");

}


// ======================================================
// FUNCTION: Get Google Maps View Information
// ======================================================

function getMapsView() {

    try {

        const url =
            new URL(window.location.href);

        const fullUrl =
            url.href;

        // --------------------------------------------------
        // Standard Google Maps viewport
        // Example:
        // @21.1458,79.0882,13z
        // --------------------------------------------------

        const standardMatch =
            fullUrl.match(
                /@(-?[\d.]+),(-?[\d.]+),([\d.]+)z/
            );

        if (standardMatch) {

            return [
                standardMatch[1],
                standardMatch[2],
                standardMatch[3]
            ].join(",");

        }

        // --------------------------------------------------
        // Fallback to URL
        // --------------------------------------------------

        return [
            url.pathname,
            url.search,
            url.hash
        ].join("");

    } catch (error) {

        console.error(
            "Could not read Google Maps view:",
            error
        );

        return window.location.href;

    }

}

// ======================================================
// FUNCTION: Check business result changes
// ======================================================

function checkBusinessResults() {

    const currentSignature =
        getVisibleBusinessSignature();


    const currentCount =
        document.querySelectorAll(
            'div[role="article"]'
        ).length;


    console.log(
        "Business check | Visible businesses:",
        currentCount
    );


    // --------------------------------------------------
    // First check
    // --------------------------------------------------

    if (
        lastBusinessSignature === ""
    ) {

        lastBusinessSignature =
            currentSignature;


        console.log(
            "Initial business list recorded."
        );


        return false;

    }


    // --------------------------------------------------
    // Compare
    // --------------------------------------------------

    if (
        currentSignature !==
        lastBusinessSignature
    ) {

        console.log(
            "Business result list changed."
        );


        console.log(
            "OLD BUSINESS SIGNATURE:",
            lastBusinessSignature
        );


        console.log(
            "NEW BUSINESS SIGNATURE:",
            currentSignature
        );


        lastBusinessSignature =
            currentSignature;


        return true;

    }


    return false;

}


// ======================================================
// FUNCTION: Check Maps view changes
// ======================================================

function checkMapsViewChange() {

    const currentView =
        getMapsView();


    // --------------------------------------------------
    // First check
    // --------------------------------------------------

    if (
        lastMapsView === ""
    ) {

        lastMapsView =
            currentView;


        console.log(
            "Initial Maps view recorded:",
            currentView
        );


        return false;

    }


    // --------------------------------------------------
    // Compare map view
    // --------------------------------------------------

    if (
        currentView !==
        lastMapsView
    ) {

        console.log(
            "MAP VIEW CHANGED"
        );


        console.log(
            "OLD VIEW:",
            lastMapsView
        );


        console.log(
            "NEW VIEW:",
            currentView
        );


        lastMapsView =
            currentView;


        return true;

    }


    return false;

}

// ======================================================
// FUNCTION: Perform automatic change check
// ======================================================

function performChangeCheck(
    reason = "interval"
) {
    
    if (
        autoScanRunning ||
        detailExtractionRunning
    ) {

        return;

    }

    console.log(
        "================================="
    );

    console.log(
        "AUTOMATIC CHANGE CHECK:",
        reason
    );

    console.log(
        "================================="
    );


    // ==================================================
    // CHECK BUSINESS RESULTS
    // ==================================================

    const businessesChanged =
        checkBusinessResults();


    // ==================================================
    // CHECK MAP VIEW
    // ==================================================

    const mapViewChanged =
        checkMapsViewChange();


    // ==================================================
    // IF SOMETHING CHANGED
    // ==================================================

    if (
        businessesChanged ||
        mapViewChanged
    ) {

        let changeReason =
            reason;


        if (
            mapViewChanged &&
            businessesChanged
        ) {

            changeReason =
                "Map view and business results changed.";

        } else if (
            mapViewChanged
        ) {

            changeReason =
                "Map view changed.";

        } else if (
            businessesChanged
        ) {

            changeReason =
                "Business results changed.";

        }


        console.log(
            "CHANGE DETECTED:",
            changeReason
        );

        console.log(
            "Scheduling automatic collection..."
        );


        // ==================================================
        // WAIT FOR GOOGLE MAPS TO FINISH LOADING
        // ==================================================

        scheduleAutomaticScan(
            changeReason
        );

    }

}

// ======================================================
// WAIT FOR GOOGLE MAPS RESULTS TO SETTLE
// ======================================================

function waitForResultsToSettle(
    maxWait = 12000,
    stableTime = 1800
) {

    return new Promise(
        (resolve) => {

            const startTime =
                Date.now();

            let lastSignature =
                getVisibleBusinessSignature();

            let stableSince =
                Date.now();

            let lastCount =
                document.querySelectorAll(
                    'div[role="article"]'
                ).length;


            console.log(
                "Waiting for Google Maps results to settle..."
            );


            function check() {

                const currentSignature =
                    getVisibleBusinessSignature();

                const currentCount =
                    document.querySelectorAll(
                        'div[role="article"]'
                    ).length;

                const now =
                    Date.now();


                // --------------------------------------------------
                // Results changed
                // --------------------------------------------------

                if (
                    currentSignature !==
                    lastSignature ||
                    currentCount !==
                    lastCount
                ) {

                    console.log(
                        "Google Maps results are still changing..."
                    );

                    lastSignature =
                        currentSignature;

                    lastCount =
                        currentCount;

                    stableSince =
                        now;

                }


                // --------------------------------------------------
                // Results stable
                // --------------------------------------------------

                if (
                    currentCount > 0 &&
                    now - stableSince >= stableTime
                ) {

                    console.log(
                        "Google Maps results are stable."
                    );

                    console.log(
                        "Stable result count:",
                        currentCount
                    );

                    resolve();

                    return;

                }


                // --------------------------------------------------
                // Maximum wait
                // --------------------------------------------------

                if (
                    now - startTime >= maxWait
                ) {

                    console.log(
                        "Maximum result wait reached."
                    );

                    console.log(
                        "Scanning currently visible results."
                    );

                    resolve();

                    return;

                }


                setTimeout(
                    check,
                    300
                );

            }


            check();

        }
    );

}

// ======================================================
// AUTOMATIC SCAN SCHEDULER
// ======================================================

function scheduleAutomaticScan(reason) {

    console.log(
        "Automatic scan requested:",
        reason
    );


    // --------------------------------------------------
    // If scan is already scheduled
    // --------------------------------------------------

    if (
        automaticScanScheduled
    ) {

        console.log(
            "Automatic scan already scheduled."
        );

        return;

    }


    automaticScanScheduled =
        true;


    if (
        automaticScanTimeout
    ) {

        clearTimeout(
            automaticScanTimeout
        );

    }


    automaticScanTimeout =
        setTimeout(
            async () => {

                try {

                    console.log(
                        "Waiting for Google Maps to finish loading..."
                    );


                    await waitForResultsToSettle(
                        12000,
                        1800
                    );


                    console.log(
                        "Google Maps results ready."
                    );


                    await autoScanAndSave();


                } catch (error) {

                    console.error(
                        "Automatic scan error:",
                        error
                    );

                } finally {

                    automaticScanScheduled =
                        false;

                    automaticScanTimeout =
                        null;

                }

            },
            800
        );

}

// ======================================================
// FUNCTION: Schedule change check
// ======================================================

function scheduleResultCheck(
    reason
) {
      if (
        autoScanRunning ||
        detailExtractionRunning ||
        isAutomaticScrolling
    ) {

        return;

    }

    // --------------------------------------------------
    // Cancel only the previous RESULT CHECK timer
    // --------------------------------------------------

    if (
        resultCheckTimeout
    ) {

        clearTimeout(
            resultCheckTimeout
        );

    }


    // --------------------------------------------------
    // Wait for Google Maps DOM activity to settle
    // --------------------------------------------------

    resultCheckTimeout =
        setTimeout(
            () => {

                resultCheckTimeout =
                    null;

                performChangeCheck(
                    reason
                );

            },
            1500
        );

}

// ======================================================
// FUNCTION: Handle DOM changes
// ======================================================

function handleMapsDomChange() {

    if (
        isAutomaticScrolling ||
        autoScanRunning ||
        detailExtractionRunning
    ) {

        console.log(
            "Ignoring DOM change during automatic extraction."
        );

        return;

    }

    console.log(
        "Google Maps DOM changed."
    );

    scheduleResultCheck(
        "DOM change"
    );

}

// ======================================================
// GET GOOGLE MAPS RESULTS CONTAINER
// ======================================================

function getResultsContainer() {

    return (
        document.querySelector(
            'div[role="feed"]'
        ) ||
        document.body
    );

}

// ======================================================
// WATCH GOOGLE MAPS USER INTERACTION
// ======================================================

function setupMapInteractionWatcher() {

    console.log(
        "Setting up Google Maps interaction watcher..."
    );

    document.addEventListener(
        "mouseup",
        handlePossibleMapInteraction,
        true
    );

    document.addEventListener(
        "touchend",
        handlePossibleMapInteraction,
        true
    );

    document.addEventListener(
        "wheel",
        handlePossibleMapInteraction,
        true
    );

}

// ======================================================
// HANDLE POSSIBLE MAP MOVEMENT / ZOOM
// ======================================================

function handlePossibleMapInteraction(event) {

    if (
        autoScanRunning ||
        detailExtractionRunning ||
        isAutomaticScrolling
    ) {

        return;

    }
    
    const target =
        event.target;

    if (!target) {
        return;
    }

    // --------------------------------------------------
    // Ignore extension UI
    // --------------------------------------------------

    if (
        target.closest &&
        target.closest(
            "input, button, select, textarea"
        )
    ) {

        return;

    }

    // --------------------------------------------------
    // Delay check so Google Maps can update its URL
    // and result cards
    // --------------------------------------------------

    if (
        mapInteractionTimeout
    ) {

        clearTimeout(
            mapInteractionTimeout
        );

    }

    mapInteractionTimeout =
        setTimeout(
            () => {

                const currentView =
                    getMapsView();

                if (
                    currentView !==
                    lastDetectedMapView
                ) {

                    console.log(
                        "Google Maps interaction detected."
                    );

                    console.log(
                        "New map view:",
                        currentView
                    );

                    lastDetectedMapView =
                        currentView;

                    mapInteractionInProgress =
                        true;

                    scheduleResultCheck(
                        "Map pan/zoom interaction"
                    );

                }

            },
            500
        );

}

// ======================================================
// START MAP WATCHER
// ======================================================

function startMapWatcher() {

    console.log(
        "================================="
    );

    console.log(
        "STARTING MAP RESULTS WATCHER"
    );

    console.log(
        "================================="
    );


    // --------------------------------------------------
    // Prevent duplicate watcher
    // --------------------------------------------------

    if (
        watcherInterval
    ) {

        console.log(
            "Watcher is already running."
        );

        return;

    }


    // --------------------------------------------------
    // Record initial business state
    // --------------------------------------------------

    lastBusinessSignature =
        getVisibleBusinessSignature();


    console.log(
        "Initial visible businesses:"
    );


    console.log(
        lastBusinessSignature
    );


    // --------------------------------------------------
    // Record initial map view
    // --------------------------------------------------

    lastMapsView =
        getMapsView();
    
    lastDetectedMapView =
        lastMapsView;

    console.log(
        "Initial Maps view:",
        lastMapsView
    );


    // --------------------------------------------------
    // Clear old notification
    // --------------------------------------------------

    chrome.storage.local.set(
        {
            mapResultsChanged:
                false,

            mapChangeReason:
                ""
        }
    );


    // ==================================================
    // MUTATION OBSERVER
    // ==================================================

    if (
        mutationObserver
    ) {

        mutationObserver.disconnect();

    }


    mutationObserver =
        new MutationObserver(
            function(
                mutations
            ) {

                console.log(
                    "DOM mutations detected:",
                    mutations.length
                );


                handleMapsDomChange();

            }
        );

    const resultsContainer =
        getResultsContainer();

    mutationObserver.observe(
        resultsContainer,
        {
            childList: true,
            subtree: true,
            characterData: true
        }
    );


    console.log(
        "DOM MutationObserver started."
    );


    // ==================================================
    // PERIODIC CHECK
    // ==================================================

    watcherInterval =
        setInterval(
            () => {

                performChangeCheck(
                    "interval"
                );

            },
            1500
        );


    console.log(
        "Map Results Change Detection started."
    );

    // ==================================================
    // INITIAL AUTOMATIC SCAN
    // ==================================================

    setTimeout(
        () => {

            console.log(
                "Starting initial automatic collection..."
            );

            autoScanAndSave();

        },
        2500
    );

    setupMapInteractionWatcher();

}


// ======================================================
// STOP MAP WATCHER
// ======================================================

function stopMapWatcher() {

    console.log(
        "Stopping Map Results Change Detection."
    );


    // --------------------------------------------------
    // Stop interval
    // --------------------------------------------------

    if (
        watcherInterval
    ) {

        clearInterval(
            watcherInterval
        );

        watcherInterval =
            null;

    }


    // --------------------------------------------------
    // Stop observer
    // --------------------------------------------------

    if (
        mutationObserver
    ) {

        mutationObserver.disconnect();

        mutationObserver =
            null;

    }


    // --------------------------------------------------
    // Clear pending result-check timer
    // --------------------------------------------------

    if (
        resultCheckTimeout
    ) {

        clearTimeout(
            resultCheckTimeout
        );

        resultCheckTimeout =
            null;

    }


    // --------------------------------------------------
    // Clear pending automatic-scan timer
    // --------------------------------------------------

    if (
        automaticScanTimeout
    ) {

        clearTimeout(
            automaticScanTimeout
        );

        automaticScanTimeout =
            null;

    }


    lastBusinessSignature =
        "";

    lastMapsView =
        "";
    
    automaticScanScheduled =
    false;

    autoScanRunning =
        false;

    console.log(
        "Map Results Change Detection stopped."
    );

    if (mapInteractionTimeout) {

        clearTimeout(
            mapInteractionTimeout
        );

        mapInteractionTimeout =
            null;

    }

    detailExtractionRunning = false;
    isAutomaticScrolling = false;

}


// ======================================================
// LISTEN FOR POPUP MESSAGES
// ======================================================

chrome.runtime.onMessage.addListener(
    function(
        message,
        sender,
        sendResponse
    ) {

        console.log(
            "Message received:",
            message
        );


        // ==================================================
        // TEST
        // ==================================================

        if (
            message.action ===
            "test"
        ) {

            sendResponse(
                {
                    success:
                        true,

                    message:
                        "Content script is working!"
                }
            );

            return true;

        }

        if (message.action === "testDetailsPanel") {

            const result =
                extractDetailsPanel();

            sendResponse({
                success: true,
                data: result
            });

            return true;
        }

        if (
            message.action === "testAllBusinessDetails"
        ) {

            extractAllBusinessDetails()
                .then(
                    result => {

                        sendResponse({
                            success: true,
                            data: result
                        });

                    }
                )
                .catch(
                    error => {

                        console.error(
                            "Full detail test failed:",
                            error
                        );

                        sendResponse({
                            success: false,
                            error:
                                error.message
                        });

                    }
                );

            return true;

        }

        // ==================================================
        // UNKNOWN ACTION
        // ==================================================

        sendResponse(
            {
                success:
                    false,

                message:
                    "Unknown action."
            }
        );


        return true;

    }
);

// ======================================================
// FUNCTION: Merge old and new businesses
// Preserve existing data when new data is empty
// ======================================================

function mergeBusinesses(
    oldBusinesses,
    newBusinesses
) {

    const businessMap =
        new Map();


    // ==================================================
    // ADD OLD DATA
    // ==================================================

    oldBusinesses.forEach(
        (business) => {

            const key =
                getBusinessKey(
                    business
                );


            if (key) {

                businessMap.set(
                    key,
                    {
                        ...business
                    }
                );

            }

        }
    );


    // ==================================================
    // ADD / UPDATE NEW DATA
    // ==================================================

    newBusinesses.forEach(
        (newBusiness) => {

            const key =
                getBusinessKey(
                    newBusiness
                );


            if (!key) {
                return;
            }


            const oldBusiness =
                businessMap.get(
                    key
                );


            // --------------------------------------------------
            // No previous record
            // --------------------------------------------------

            if (!oldBusiness) {

                businessMap.set(
                    key,
                    {
                        ...newBusiness
                    }
                );

                return;

            }


            // --------------------------------------------------
            // Merge records
            // Keep old value when new value is empty
            // --------------------------------------------------

            const mergedBusiness = {

                ...oldBusiness,

                ...newBusiness,

                name:
                    newBusiness.name ||
                    oldBusiness.name ||
                    "",

                category:
                    newBusiness.category ||
                    oldBusiness.category ||
                    "",

                address:
                    newBusiness.address ||
                    oldBusiness.address ||
                    "",

                phone:
                    newBusiness.phone ||
                    oldBusiness.phone ||
                    "",

                website:
                    newBusiness.website ||
                    oldBusiness.website ||
                    "",

                rating:
                    newBusiness.rating ||
                    oldBusiness.rating ||
                    "",

                reviews:
                    newBusiness.reviews ||
                    oldBusiness.reviews ||
                    "",

                mapsUrl:
                    newBusiness.mapsUrl ||
                    oldBusiness.mapsUrl ||
                    "",
                
                comments:
                    uniqueComments([
                        ...(oldBusiness.comments || []),
                        ...(newBusiness.comments || [])
                    ]),

                photoLinks:
                    uniqueStrings([
                        ...(oldBusiness.photoLinks || []),
                        ...(newBusiness.photoLinks || [])
                    ]),

                photosUrl:
                    newBusiness.photosUrl ||
                    oldBusiness.photosUrl ||
                    "",
                
                commentsCollected:
                    newBusiness.commentsCollected ||
                    oldBusiness.commentsCollected ||
                    false,

                photosCollected:
                    newBusiness.photosCollected ||
                    oldBusiness.photosCollected ||
                    false

                    };


            businessMap.set(
                key,
                mergedBusiness
            );

        }
    );


    // ==================================================
    // RETURN FINAL UNIQUE LIST
    // ==================================================

    return [
        ...businessMap.values()
    ];

}

// ======================================================
// AUTOMATICALLY SAVE BUSINESSES
// ======================================================

function autoSaveBusinesses(
    newBusinesses
) {

    return new Promise(
        (resolve, reject) => {

            if (
                !newBusinesses ||
                newBusinesses.length === 0
            ) {

                console.log(
                    "No businesses found to save."
                );

                resolve();

                return;

            }


            chrome.storage.local.get(
                ["businesses"],
                (result) => {

                    if (
                        chrome.runtime.lastError
                    ) {

                        console.error(
                            "Storage read error:",
                            chrome.runtime.lastError.message
                        );

                        reject(
                            chrome.runtime.lastError
                        );

                        return;

                    }


                    const oldBusinesses =
                        result.businesses || [];


                    console.log(
                        "Previously stored businesses:",
                        oldBusinesses.length
                    );

                    console.log(
                        "New businesses:",
                        newBusinesses.length
                    );


                    const uniqueBusinesses =
                        mergeBusinesses(
                            oldBusinesses,
                            newBusinesses
                        );


                    chrome.storage.local.set(
                        {
                            businesses:
                                uniqueBusinesses
                        },
                        () => {

                            if (
                                chrome.runtime.lastError
                            ) {

                                console.error(
                                    "Automatic save error:",
                                    chrome.runtime.lastError.message
                                );

                                reject(
                                    chrome.runtime.lastError
                                );

                                return;

                            }


                            console.log(
                                "================================="
                            );

                            console.log(
                                "AUTOMATIC SAVE COMPLETED"
                            );

                            console.log(
                                "New:",
                                newBusinesses.length
                            );

                            console.log(
                                "Total unique:",
                                uniqueBusinesses.length
                            );

                            console.log(
                                "================================="
                            );


                            resolve();

                        }
                    );

                }
            );

        }
    );

}

// ======================================================
// AUTOMATICALLY SCAN AND SAVE
// ======================================================
async function autoScanAndSave() {

    if (autoScanRunning) {

        console.log(
            "Automatic scan already running."
        );

        return;

    }


    autoScanRunning =
        true;


    console.log(
        "================================="
    );

    console.log(
        "AUTOMATIC SCAN STARTED"
    );

    console.log(
        "================================="
    );


    try {

        await waitForResultsToSettle(
            12000,
            1800
        );


        const businesses =
            await scanResultsAndEnrich(
                12,
                1500
            );


        console.log(
            "AUTOMATIC SCAN FINAL RESULT:",
            businesses
        );


    } catch (error) {

        console.error(
            "Automatic scan failed:",
            error
        );

    } finally {

        autoScanRunning =
            false;


        // ==================================================
        // Reset watcher baseline
        // ==================================================

        lastBusinessSignature =
            getVisibleBusinessSignature();


        lastMapsView =
            getMapsView();


        lastDetectedMapView =
            lastMapsView;


        if (resultCheckTimeout) {

            clearTimeout(
                resultCheckTimeout
            );

            resultCheckTimeout =
                null;

        }


        console.log(
            "Automatic scan finished."
        );

    }

}

// ======================================================
// AUTOMATIC START
// ======================================================

console.log(
    "Starting Google Maps Business Exporter automatically..."
);


setTimeout(
    async () => {

        try {

            const result =
                await chrome.storage.local.get(
                    ["extractionConfig"]
                );

            if (
                !result.extractionConfig ||
                !result.extractionConfig.jobId ||
                !result.extractionConfig.sourceId
            ) {

                console.warn(
                    "Laravel extraction configuration is missing."
                );

                console.warn(
                    "Please open the extension popup and save Job ID and Source ID."
                );

            } else {

                console.log(
                    "Laravel extraction configuration loaded:",
                    result.extractionConfig
                );

            }

        } catch (error) {

            console.error(
                "Failed to load extraction configuration:",
                error
            );

        }

        startMapWatcher();

    },
    2000
);

async function waitForBusinessCards(
    minCards = 5,
    timeout = 15000
) {

    console.log(
        "Waiting for Google Maps business cards..."
    );

    const startTime = Date.now();

    while (
        Date.now() - startTime < timeout
    ) {

        const count =
            document.querySelectorAll(
                'div[role="article"]'
            ).length;

        console.log(
            "Current business card count:",
            count
        );

        if (count >= minCards) {

            console.log(
                "Enough business cards loaded:",
                count
            );

            return true;

        }

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    500
                )
        );

    }

    const finalCount =
        document.querySelectorAll(
            'div[role="article"]'
        ).length;

    console.log(
        "Business card wait finished.",
        "Final count:",
        finalCount
    );

    return finalCount > 0;
}
// ======================================================
// AUTOMATICALLY SCROLL GOOGLE MAPS RESULTS
// ======================================================

async function scanResultsAndEnrich(
    maxScrolls = 12,
    delay = 1500
) {

    let collectedBusinesses =
        await getStoredBusinesses();

    const attemptedKeys =
        new Set();

    let noProgressCount = 0;

    console.log(
        "================================="
    );

    console.log(
        "RESULT SCAN + DETAIL ENRICHMENT STARTED"
    );

    console.log(
        "Already stored:",
        collectedBusinesses.length
    );

    console.log(
        "================================="
    );

    isAutomaticScrolling = true;

    try {

        // ==================================================
        // INITIAL WAIT
        // ==================================================

        await waitForResultsToSettle(
            12000,
            1500
        );

        await waitForBusinessCards(
            3,
            10000
        );


        // ==================================================
        // MAIN SCROLL LOOP
        // ==================================================

        for (
            let i = 0;
            i < maxScrolls;
            i++
        ) {

            console.log(
                "---------------------------------"
            );

            console.log(
                `SCAN BATCH ${i + 1}/${maxScrolls}`
            );

            console.log(
                "---------------------------------"
            );


            // ==================================================
            // Wait for Google Maps results
            // ==================================================

            await waitForResultsToSettle(
                10000,
                1200
            );


            // ==================================================
            // Make sure cards exist
            // ==================================================

            await waitForBusinessCards(
                1,
                8000
            );


            // ==================================================
            // Extract CURRENT visible businesses
            // ==================================================

            const currentVisible =
                extractBusinesses();

            console.log(
                "Current visible businesses:",
                currentVisible.length
            );


            console.log(
                "Current visible names:",
                currentVisible.map(
                    business =>
                        business.name
                )
            );


            // ==================================================
            // Process current batch
            // ==================================================

            if (
                currentVisible.length > 0
            ) {

                collectedBusinesses =
                    await processVisibleBusinessBatch(
                        collectedBusinesses,
                        attemptedKeys
                    );

            } else {

                console.warn(
                    "No businesses found in current batch."
                );

            }


            // ==================================================
            // Get fresh feed
            // ==================================================

            const feed =
                document.querySelector(
                    'div[role="feed"]'
                );


            if (!feed) {

                console.warn(
                    "Google Maps feed not found."
                );

                break;

            }


            // ==================================================
            // Capture current state
            // ==================================================

            const beforeHeight =
                feed.scrollHeight;

            const beforeScrollTop =
                feed.scrollTop;

            const beforeSignature =
                getVisibleBusinessSignature();


            console.log(
                "Before scroll:",
                {
                    height:
                        beforeHeight,

                    scrollTop:
                        beforeScrollTop,

                    businesses:
                        currentVisible.length
                }
            );


            // ==================================================
            // Scroll DOWN
            // ==================================================

            feed.scrollTo({
                top:
                    feed.scrollHeight,

                behavior:
                    "auto"
            });


            // ==================================================
            // Wait for Google Maps
            // ==================================================

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        delay
                    )
            );


            await waitForResultsToSettle(
                10000,
                1000
            );


            // ==================================================
            // Get NEW feed
            // ==================================================

            const newFeed =
                document.querySelector(
                    'div[role="feed"]'
                );


            if (!newFeed) {

                console.warn(
                    "Feed disappeared after scrolling."
                );

                break;

            }


            const afterHeight =
                newFeed.scrollHeight;

            const afterScrollTop =
                newFeed.scrollTop;

            const afterSignature =
                getVisibleBusinessSignature();


            console.log(
                "After scroll:",
                {
                    height:
                        afterHeight,

                    scrollTop:
                        afterScrollTop,

                    signatureChanged:
                        afterSignature !==
                        beforeSignature
                }
            );


            // ==================================================
            // Detect progress
            // ==================================================

            const heightChanged =
                afterHeight >
                beforeHeight;

            const resultsChanged =
                afterSignature !==
                beforeSignature;

            const scrollChanged =
                afterScrollTop >
                beforeScrollTop + 50;


            if (
                heightChanged ||
                resultsChanged ||
                scrollChanged
            ) {

                noProgressCount = 0;

                console.log(
                    "New results progress detected."
                );

            } else {

                noProgressCount++;

                console.log(
                    "No progress detected:",
                    noProgressCount
                );

            }


            // ==================================================
            // Stop only after multiple failures
            // ==================================================

            if (
                noProgressCount >= 3
            ) {

                console.log(
                    "No more Google Maps results detected."
                );

                break;

            }

        }


        console.log(
            "================================="
        );

        console.log(
            "RESULT SCAN FINISHED"
        );

        console.log(
            "Total collected:",
            collectedBusinesses.length
        );

        console.log(
            "================================="
        );


        return collectedBusinesses;

    } finally {

        isAutomaticScrolling =
            false;

    }

}

function extractFullAddressFromDetailsPanel() {

    console.log(
        "Searching for FULL Google Maps address..."
    );

    // ==================================================
    // Method 1: Google Maps address data-item-id
    // ==================================================

    const addressElements =
        document.querySelectorAll(
            '[data-item-id="address"]'
        );

    for (const element of addressElements) {

        const aria =
            element.getAttribute(
                "aria-label"
            ) || "";

        const text =
            element.innerText?.trim() || "";

        const title =
            element.getAttribute(
                "title"
            ) || "";

        console.log(
            "Address element found:",
            {
                aria,
                text,
                title
            }
        );

        const candidates = [
            text,
            aria,
            title
        ];

        for (const candidate of candidates) {

            const cleaned =
                cleanGoogleMapsAddress(
                    candidate
                );

            if (cleaned) {

                console.log(
                    "FULL ADDRESS FOUND:",
                    cleaned
                );

                return cleaned;

            }

        }

    }


    // ==================================================
    // Method 2: Button with address data-item-id
    // ==================================================

    const addressButton =
        document.querySelector(
            'button[data-item-id="address"]'
        );

    if (addressButton) {

        const text =
            addressButton.innerText?.trim() || "";

        const aria =
            addressButton.getAttribute(
                "aria-label"
            ) || "";

        const cleaned =
            cleanGoogleMapsAddress(
                text || aria
            );

        if (cleaned) {

            console.log(
                "FULL ADDRESS FOUND FROM BUTTON:",
                cleaned
            );

            return cleaned;

        }

    }


    console.warn(
        "FULL Google Maps address was not found."
    );

    return "";
}
// ======================================================
// FUNCTION: Extract phone + website from business details
// ======================================================

function extractDetailsPanel() {

    console.log(
        "================================="
    );

    console.log(
        "DETAILS PANEL EXTRACTION STARTED"
    );

    console.log(
        "================================="
    );
    
    let address = "";
    let phone = "";
    let website = "";

    // ==================================================
    // FULL ADDRESS
    // ==================================================

    address =
        extractFullAddressFromDetailsPanel();

    console.log(
        "DETAILS PANEL FULL ADDRESS:",
        address
    );

    // ==================================================
    // PHONE
    // ==================================================

    // Method 1: tel link
    const telLinks =
        document.querySelectorAll(
            'a[href^="tel:"]'
        );

    for (
        const link of telLinks
    ) {

        const href =
            link.getAttribute("href") || "";

        const value =
            cleanPhone(
                href.replace(
                    /^tel:/i,
                    ""
                )
            );

        if (value) {

            phone = value;

            console.log(
                "Phone found from tel link:",
                phone
            );

            break;

        }

    }

    // Method 2: phone data-item-id
    if (!phone) {

        const phoneElements =
            document.querySelectorAll(
                '[data-item-id*="phone" i]'
            );

        for (
            const element of phoneElements
        ) {

            const dataItemId =
                element.getAttribute(
                    "data-item-id"
                ) || "";

            const aria =
                element.getAttribute(
                    "aria-label"
                ) || "";

            const text =
                element.innerText || "";

            let value =
                dataItemId
                    .replace(
                        /^phone:/i,
                        ""
                    )
                    .trim();

            if (!value) {

                value = aria;

            }

            if (!value) {

                value = text;

            }

            value =
                cleanPhone(value);

            // Remove "Phone:"
            value =
                value.replace(
                    /^phone\s*:?\s*/i,
                    ""
                ).trim();

            if (value) {

                phone = value;

                console.log(
                    "Phone found:",
                    phone
                );

                break;

            }

        }

    }

    // Method 3: aria-label
    if (!phone) {

        const phoneCandidates =
            document.querySelectorAll(
                '[aria-label*="phone" i]'
            );

        for (
            const element of phoneCandidates
        ) {

            const aria =
                element.getAttribute(
                    "aria-label"
                ) || "";

            const text =
                element.innerText || "";

            const value =
                cleanPhone(
                    aria || text
                )
                    .replace(
                        /^phone\s*:?\s*/i,
                        ""
                    )
                    .trim();

            if (value) {

                phone = value;

                console.log(
                    "Phone found from aria:",
                    phone
                );

                break;

            }

        }

    }

    // ==================================================
    // WEBSITE
    // ==================================================

    // Method 1: authority link
    const authorityLinks =
        document.querySelectorAll(
            'a[data-item-id*="authority" i]'
        );

    for (
        const link of authorityLinks
    ) {

        const href =
            link.href || "";

        if (
            isValidBusinessWebsite(
                href
            )
        ) {

            website =
                cleanWebsiteUrl(
                    href
                );

            console.log(
                "Website found:",
                website
            );

            break;

        }

    }

    // Method 2: links containing website text
    if (!website) {

        const links =
            document.querySelectorAll(
                "a[href]"
            );

        for (
            const link of links
        ) {

            const href =
                link.href || "";

            const text =
                (
                    link.innerText ||
                    ""
                ).trim();

            const aria =
                (
                    link.getAttribute(
                        "aria-label"
                    ) || ""
                ).trim();

            const combined =
                `${text} ${aria}`;

            if (
                /website|web site|official site/i.test(
                    combined
                ) &&
                isValidBusinessWebsite(
                    href
                )
            ) {

                website =
                    cleanWebsiteUrl(
                        href
                    );

                console.log(
                    "Website found from text:",
                    website
                );

                break;

            }

        }

    }

    console.log(
        "DETAILS PANEL DATA:",
        {
            address,
            phone,
            website
        }
    );

    return {
        address,
        phone,
        website
    };

}

// ======================================================
// FUNCTION: Extract Google Maps photo gallery URL
// ======================================================

function extractPhotosUrl() {

    const links =
        document.querySelectorAll(
            'a[href]'
        );


    for (
        const link of links
    ) {

        const href =
            link.href || "";


        if (
            href.includes(
                "google.com/maps"
            ) &&
            href.includes(
                "/photos"
            )
        ) {

            console.log(
                "Google Maps Photos URL found:",
                href
            );


            return href;

        }

    }


    return "";

}

// ======================================================
// FUNCTION: Extract all business details
// Phone + Website + Comments + Photo Links
// ======================================================

async function extractAllBusinessDetails() {

    console.log(
        "================================="
    );

    console.log(
        "FULL BUSINESS DETAILS EXTRACTION STARTED"
    );

    console.log(
        "================================="
    );


    // ==================================================
    // LOAD EXTRACTION CONFIG
    // ==================================================

    const config =
        await loadExtractionConfig();

    console.log(
        "Extraction config:",
        config
    );


    // ==================================================
    // STEP 1: PHONE + WEBSITE + ADDRESS
    // ==================================================

    const basicDetails =
        extractDetailsPanel();

    console.log(
        "Basic details extracted:",
        basicDetails
    );


    // ==================================================
    // STEP 2: PHOTO LINKS
    // ==================================================

    let photoLinks = [];
    let photosUrl = "";
    let photosCollected = false;

    try {

        photoLinks =
            extractVisiblePhotoLinks();

        photosUrl =
            extractPhotosUrl();

        photosCollected =
            Boolean(
                photosUrl ||
                photoLinks.length > 0
            );

        console.log(
            "Photo links found:",
            photoLinks.length
        );

        console.log(
            "Photos URL:",
            photosUrl
        );

    } catch (error) {

        console.error(
            "Photo extraction failed:",
            error
        );

        photosCollected =
            false;
    }


    // ==================================================
    // STEP 3: REVIEWS
    // ==================================================

    let comments = [];
    let commentsCollected = false;

    try {

        // --------------------------------------------------
        // REVIEWS OFF
        // --------------------------------------------------

        if (!config.collectReviews) {

            console.log(
                "Reviews collection is disabled."
            );

            comments = [];

            commentsCollected = false;

        }

        // --------------------------------------------------
        // REVIEWS ON
        // --------------------------------------------------

        else {

            console.log(
                "Reviews collection is enabled."
            );

            // Open Reviews panel
            const reviewsOpened =
                await openReviewsPanel();

            console.log(
                "Reviews opened:",
                reviewsOpened
            );


            if (reviewsOpened) {

                // --------------------------------------------------
                // FULL REVIEWS / CURRENT REVIEWS
                // --------------------------------------------------

                comments =
                    await extractReviewsForBusiness(
                        config.collectFullReviews
                    );

                commentsCollected =
                    comments.length > 0;

                console.log(
                    "Comments found:",
                    comments.length
                );

                console.log(
                    "Full Reviews mode:",
                    config.collectFullReviews
                );

            }

            else {

                console.log(
                    "Reviews panel could not be opened."
                );

                comments = [];

                commentsCollected = false;
            }
        }

    } catch (error) {

        console.error(
            "Review extraction failed:",
            error
        );

        comments = [];

        commentsCollected = false;
    }


    // ==================================================
    // STEP 4: FINAL RESULT
    // ==================================================

    const result = {

        address:
            basicDetails.address || "",

        phone:
            basicDetails.phone || "",

        website:
            basicDetails.website || "",

        comments:
            comments,

        photoLinks:
            photoLinks,

        photosUrl:
            photosUrl || "",

        commentsCollected:
            commentsCollected,

        photosCollected:
            photosCollected
    };


    // ==================================================
    // DEBUG
    // ==================================================

    console.log(
        "================================="
    );

    console.log(
        "FULL BUSINESS DETAILS:",
        result
    );

    console.log(
        "================================="
    );


    return result;
}

function waitForCondition(
    condition,
    timeout = 10000,
    interval = 300
) {

    return new Promise(
        (resolve, reject) => {

            const start =
                Date.now();


            function check() {

                try {

                    const result =
                        condition();

                    if (result) {

                        resolve(
                            result
                        );

                        return;

                    }

                } catch (error) {
                    // Ignore temporary DOM errors
                }


                if (
                    Date.now() - start >=
                    timeout
                ) {

                    reject(
                        new Error(
                            "Condition wait timed out."
                        )
                    );

                    return;

                }


                setTimeout(
                    check,
                    interval
                );

            }


            check();

        }
    );

}
function findBusinessCard(
    mapsUrl
) {

    if (!mapsUrl) {
        return null;
    }


    const targetUrl =
        normalizeMapsUrl(
            mapsUrl
        );


    const cards =
        document.querySelectorAll(
            'div[role="article"]'
        );


    for (const card of cards) {

        const link =
            card.querySelector(
                'a[href*="/maps/place/"]'
            );


        if (!link || !link.href) {
            continue;
        }


        const cardUrl =
            normalizeMapsUrl(
                link.href
            );


        if (
            cardUrl === targetUrl
        ) {

            return card;

        }

    }


    return null;

}
async function waitForBusinessCard(
    mapsUrl,
    timeout = 10000
) {

    return waitForCondition(
        () =>
            findBusinessCard(
                mapsUrl
            ),
        timeout,
        300
    );

}
function isBusinessDetailsView() {

    return window.location.pathname.includes(
        "/maps/place/"
    );

}

async function waitForDetailsPanel(
    business,
    timeout = 20000
) {

    console.log(
        "Waiting for business details page:",
        business.name
    );

    return waitForCondition(
        () => {

            // ==================================================
            // CONDITION 1
            // Google Maps has navigated to a business page
            // ==================================================

            const onBusinessPage =
                window.location.pathname.includes(
                    "/maps/place/"
                );

            if (onBusinessPage) {

                console.log(
                    "Google Maps business page detected:",
                    window.location.href
                );

                return true;

            }


            // ==================================================
            // CONDITION 2
            // Business name is visible
            // ==================================================

            const expectedName =
                (business.name || "")
                    .trim()
                    .toLowerCase();

            if (expectedName) {

                const pageText =
                    (
                        document.body.innerText ||
                        ""
                    ).toLowerCase();

                if (
                    pageText.includes(
                        expectedName
                    )
                ) {

                    console.log(
                        "Business name detected:",
                        business.name
                    );

                    return true;

                }

            }


            // ==================================================
            // CONDITION 3
            // Known Google Maps detail elements
            // ==================================================

            const detailSelectors = [

                '[data-item-id="address"]',

                '[data-item-id^="phone:"]',

                '[data-item-id*="phone" i]',

                'a[data-item-id="authority"]',

                'button[aria-label*="Phone" i]',

                'button[aria-label*="Website" i]'

            ];


            for (
                const selector of detailSelectors
            ) {

                const element =
                    document.querySelector(
                        selector
                    );

                if (element) {

                    console.log(
                        "Business detail element detected:",
                        selector
                    );

                    return true;

                }

            }


            return false;

        },
        timeout,
        300
    );

}

async function waitForResultsView(
    timeout = 12000
) {

    return waitForCondition(
        () => {

            const feed =
                document.querySelector(
                    'div[role="feed"]'
                );

            const cards =
                document.querySelector(
                    'div[role="article"]'
                );

            return (
                !isBusinessDetailsView() &&
                feed &&
                cards
            );

        },
        timeout,
        300
    );

}
async function returnToResults(previousScrollTop = 0) {

    console.log(
        "================================="
    );

    console.log(
        "RETURNING TO GOOGLE MAPS RESULTS"
    );

    console.log(
        "================================="
    );

    try {

        /*
         * STEP 1
         * If the Reviews panel is open, close it first.
         */
        await closeReviewsPanelIfOpen();

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    500
                )
        );


        /*
         * STEP 2
         * Look for the business-details back button.
         *
         * Do NOT blindly use:
         * button[aria-label*="Back" i]
         *
         * because Google Maps may have several Back buttons.
         */
        const backButtons =
            Array.from(
                document.querySelectorAll(
                    'button[aria-label*="Back" i]'
                )
            ).filter(
                button =>
                    isVisibleElement(button)
            );


        console.log(
            "Visible Back buttons:",
            backButtons.length
        );


        /*
         * Try the first visible Back button.
         *
         * Google Maps normally uses this to return
         * from the business details page.
         */
        if (
            isBusinessDetailsView() &&
            backButtons.length > 0
        ) {

            console.log(
                "Clicking visible Google Maps Back button."
            );

            backButtons[0].click();

        } else if (
            isBusinessDetailsView()
        ) {

            console.log(
                "Google Maps Back button not found."
            );

            console.log(
                "Using browser history.back()."
            );

            window.history.back();

        }


        /*
         * STEP 3
         *
         * Do NOT require that the URL stops containing
         * /maps/place/.
         *
         * Google Maps can keep the place URL while restoring
         * the results interface.
         *
         * Instead, wait for the actual results feed and
         * business cards.
         */
        await waitForCondition(
            () => {

                const feed =
                    document.querySelector(
                        'div[role="feed"]'
                    );

                const cards =
                    document.querySelectorAll(
                        'div[role="article"]'
                    );


                return (
                    feed &&
                    cards.length > 0
                );

            },
            20000,
            300
        );


        console.log(
            "Google Maps results feed restored."
        );


        /*
         * STEP 4
         * Restore previous scroll position.
         */
        const feed =
            document.querySelector(
                'div[role="feed"]'
            );


        if (feed) {

            feed.scrollTo({
                top:
                    previousScrollTop,

                behavior:
                    "auto"
            });


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        700
                    )
            );

        }


        console.log(
            "================================="
        );

        console.log(
            "SUCCESSFULLY RETURNED TO RESULTS"
        );

        console.log(
            "================================="
        );


        return true;

    } catch (error) {

        console.error(
            "Failed to return to results:",
            error
        );

        /*
         * Last recovery attempt.
         */
        try {

            console.log(
                "Trying history.back() as final recovery..."
            );

            window.history.back();

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        1500
                    )
            );

        } catch (recoveryError) {

            console.error(
                "Final recovery failed:",
                recoveryError
            );

        }


        return false;

    }

}

async function extractDetailsForBusiness(
    business
) {

    if (
        !business ||
        !business.mapsUrl
    ) {

        return {
            address: "",
            phone: "",
            website: "",
            comments: [],
            photoLinks: [],
            photosUrl: "",
            commentsCollected: false,
            photosCollected: false
            
        };

    }


    console.log(
        "================================="
    );

    console.log(
        "OPENING BUSINESS:",
        business.name
    );

    console.log(
        "MAPS URL:",
        business.mapsUrl
    );

    console.log(
        "================================="
    );


    // ==================================================
    // Find current business card
    // ==================================================

    const card =
        await waitForBusinessCard(
            business.mapsUrl,
            10000
        );


    if (!card) {

        throw new Error(
            "Business card not found: " +
            business.name
        );

    }


    // ==================================================
    // Remember current scroll position
    // ==================================================

    const feed =
        document.querySelector(
            'div[role="feed"]'
        );


    const previousScrollTop =
        feed
            ? feed.scrollTop
            : 0;
            


    let details = {
        address: "",
        phone: "",
        website: "",
        comments: [],
        photoLinks: [],
        photosUrl: "",
        commentsCollected: false,
        photosCollected:false

    };


    try {

        // ==================================================
        // Scroll target card into view
        // ==================================================

        card.scrollIntoView({
            behavior: "auto",
            block: "center"
        });


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    500
                )
        );


        // ==================================================
        // Get business link
        // ==================================================

        const link =
            card.querySelector(
                'a[href*="/maps/place/"]'
            );


        if (!link) {

            throw new Error(
                "Business Maps link not found."
            );

        }


        console.log(
            "Opening business details..."
        );


        link.click();


        // ==================================================
        // Wait until Google Maps enters details view
        // ==================================================

        await waitForDetailsPanel(
            business,
            20000
        );

        console.log(
            "DETAILS PAGE READY:",
            {
                url: window.location.href,
                pathname: window.location.pathname,
                business: business.name
            }
        );


        // ==================================================
        // Wait for panel DOM
        // ==================================================

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    1800
                )
        );


        // ==================================================
        // Extract phone + website
        // ==================================================

        details =
            await extractAllBusinessDetails();


        console.log(
            "ALL DETAILS FOUND:",
            business.name,
            details
        );


        return details;

    } catch (error) {

        console.error(
            "Detail extraction error:",
            business.name,
            error
        );

        return details;

    } finally {

        // ==================================================
        // ALWAYS return to search results
        // ==================================================

        if (
            isBusinessDetailsView()
        ) {

            try {

                await returnToResults(
                    previousScrollTop
                );

            } catch (returnError) {

                console.error(
                    "Failed to return to results:",
                    returnError
                );

            }

        }

    }

}

function findBusinessInList(
    businesses,
    targetBusiness
) {

    const targetKey =
        getBusinessKey(
            targetBusiness
        );


    if (!targetKey) {
        return null;
    }


    return (
        businesses.find(
            business =>
                getBusinessKey(
                    business
                ) === targetKey
        ) ||
        null
    );

}

function getStoredBusinesses() {

    return new Promise(
        (resolve, reject) => {

            chrome.storage.local.get(
                ["businesses"],
                (result) => {

                    if (
                        chrome.runtime.lastError
                    ) {

                        reject(
                            chrome.runtime.lastError
                        );

                        return;

                    }


                    resolve(
                        result.businesses || []
                    );

                }
            );

        }
    );

}

async function processVisibleBusinessBatch(
    collectedBusinesses,
    attemptedKeys
) {

    const visibleBusinesses =
        extractBusinesses();


    if (
        visibleBusinesses.length === 0
    ) {

        console.log(
            "No visible businesses found."
        );

        return collectedBusinesses;

    }


    // Remove duplicates inside current batch

    const batch =
        mergeBusinesses(
            [],
            visibleBusinesses
        );


   console.log(
    "================================="
);

console.log(
    "CURRENT VISIBLE BATCH:",
    batch.length
);

console.log(
    "BUSINESSES IN BATCH:",
    batch.map(
        business => ({
            name:
                business.name,

            mapsUrl:
                business.mapsUrl
        })
    )
);

console.log(
    "================================="
);


    for (
        let i = 0;
        i < batch.length;
        i++
    ) {

        const visibleBusiness =
            batch[i];

        console.log(
            "================================="
        );

        console.log(
            `PROCESSING BATCH ITEM ${i + 1}/${batch.length}`
        );

        console.log(
            "Business:",
            visibleBusiness.name
        );

        console.log(
            "Maps URL:",
            visibleBusiness.mapsUrl
        );

        console.log(
            "================================="
        );


        const key =
            getBusinessKey(
                visibleBusiness
            );


        if (!key) {
            continue;
        }


        // ==================================================
        // Check whether already collected
        // ==================================================

        const existing =
            findBusinessInList(
                collectedBusinesses,
                visibleBusiness
            );


        let business =
            existing
                ? mergeBusinesses(
                    [existing],
                    [visibleBusiness]
                )[0]
                : {
                    ...visibleBusiness,

                    comments:
                        visibleBusiness.comments || [],

                    photoLinks:
                        visibleBusiness.photoLinks || [],

                    photosUrl:
                        visibleBusiness.photosUrl || "",

                    commentsCollected:
                        visibleBusiness.commentsCollected || false,

                    photosCollected:
                        visibleBusiness.photosCollected || false
                };


        // ==================================================
        // Already has both values
        // ==================================================

        if (
             false
        ) {

            console.log(
                "Business already fully processed:",
                business.name
            );

            collectedBusinesses =
                mergeBusinesses(
                    collectedBusinesses,
                    [business]
                );

            continue;

        }


        // ==================================================
        // Don't repeatedly attempt same business
        // during one scan
        // ==================================================

        if (
            attemptedKeys.has(key)
        ) {

            console.log(
                "Already attempted:",
                business.name
            );

            continue;

        }


        attemptedKeys.add(
            key
        );


        console.log(
            `Processing ${i + 1}/${batch.length}:`,
            business.name
        );


        // ==================================================
        // Open + extract details
        // ==================================================

        const details =
            await extractDetailsForBusiness(
                business
            );


        // ==================================================
        // Merge extracted values
        // ==================================================

        business = {

            ...business,

            address:
                details.address ||
                business.address ||
                "",

            phone:
                details.phone ||
                business.phone ||
                "",

            website:
                details.website ||
                business.website ||
                "",

            comments:
                uniqueComments([
                    ...(business.comments || []),
                    ...(details.comments || [])
                ]),

            photoLinks:
                uniqueStrings([
                    ...(business.photoLinks || []),
                    ...(details.photoLinks || [])
                ]),

             photosUrl:
                details.photosUrl ||
                business.photosUrl ||
                "",

            commentsCollected:
                details.commentsCollected ||
                business.commentsCollected ||
                false,

            photosCollected:
                details.photosCollected ||
                business.photosCollected ||
                false


        };


        console.log(
            "Final business:",
            business
        );


        // ==================================================
        // Update in-memory collection
        // ==================================================

        collectedBusinesses =
            mergeBusinesses(
                collectedBusinesses,
                [business]
            );


        // ==================================================
        // Save immediately
        // ==================================================

        await autoSaveBusinesses(
            [business]
        );

        console.log(
            "================================="
        );

        console.log(
            "FINAL BUSINESS BEFORE SAVE:",
            {
                name: business.name,
                address: business.address,
                phone: business.phone,
                website: business.website
            }
        );

        console.log(
            "================================="
        );

        // ==================================================
        // SEND ACTUAL BUSINESS DATA TO LARAVEL
        // ==================================================

        try {

            const config =
                await loadExtractionConfig();


            console.log(
                "Sending actual Google Maps business to Laravel:",
                {
                    jobId:
                        config.jobId,

                    sourceId:
                        config.sourceId,

                    businessName:
                        business.name,

                    reviews:
                        business.comments?.length || 0,

                    photos:
                        business.photoLinks?.length || 0
                }
            );


            const laravelResult =
                await sendBusinessToLaravel({

                    jobId:
                        config.jobId,

                    sourceId:
                        config.sourceId,

                    business:
                        business,

                    reviews:
                        business.comments || [],

                    photos:
                        business.photoLinks || []

                });


            console.log(
                "================================="
            );

            console.log(
                "REAL GOOGLE MAPS DATA SENT TO LARAVEL"
            );

            console.log(
                "Business:",
                business.name
            );

            console.log(
                "Laravel result:",
                laravelResult
            );

            console.log(
                "================================="
            );


        } catch (error) {

            console.error(
                "Laravel import failed:",
                business.name,
                error
            );

        }


        // ==================================================
        // Small delay
        // ==================================================

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    500
                )
        );

    }


    return collectedBusinesses;

}


function isVisibleElement(element) {

    if (!element) {
        return false;
    }


    const style =
        window.getComputedStyle(
            element
        );


    if (
        style.display === "none" ||
        style.visibility === "hidden"
    ) {

        return false;

    }


    const rect =
        element.getBoundingClientRect();


    return (
        rect.width > 0 &&
        rect.height > 0
    );

}


function findReviewsButton() {

    const candidates = [];


    const elements =
        document.querySelectorAll(
            'button, [role="button"]'
        );


    for (const element of elements) {

        if (
            !isVisibleElement(
                element
            )
        ) {

            continue;

        }


        const text =
            (
                element.innerText ||
                ""
            )
                .replace(/\s+/g, " ")
                .trim();


        const aria =
            (
                element.getAttribute(
                    "aria-label"
                ) || ""
            )
                .replace(/\s+/g, " ")
                .trim();


        const combined =
            `${text} ${aria}`.trim();


        if (
            !/reviews?/i.test(
                combined
            )
        ) {

            continue;

        }


        // ----------------------------------------------
        // Strong candidate:
        // "Reviews"
        // "123 Reviews"
        // "1,234 Reviews"
        // ----------------------------------------------

        const exactReviewLabel =
            /^(?:[\d,.KkMm]+\s*)?reviews?$/i;


        let score = 0;


        if (
            exactReviewLabel.test(
                text
            )
        ) {

            score += 100;

        }


        if (
            exactReviewLabel.test(
                aria
            )
        ) {

            score += 80;

        }


        if (
            /\breviews?\b/i.test(
                text
            )
        ) {

            score += 30;

        }


        if (
            /\breviews?\b/i.test(
                aria
            )
        ) {

            score += 20;

        }


        candidates.push({
            element,
            text,
            aria,
            score
        });

    }


    candidates.sort(
        (a, b) =>
            b.score -
            a.score
    );


    console.log(
        "Review button candidates:",
        candidates.map(
            candidate => ({
                text:
                    candidate.text,

                aria:
                    candidate.aria,

                score:
                    candidate.score
            })
        )
    );


    if (
        candidates.length === 0
    ) {

        console.log(
            "No visible Reviews button found."
        );

        return null;

    }


    const selected =
        candidates[0];


    console.log(
        "Selected Reviews button:",
        selected
    );


    return selected.element;

}

async function openReviewsPanel() {

    console.log("=================================");
    console.log("OPENING REVIEWS PANEL");
    console.log("=================================");

    const reviewsButton = findReviewsButton();

    if (!reviewsButton) {

        console.warn(
            "Reviews button not found."
        );

        return false;
    }

    console.log(
        "Reviews button found:",
        reviewsButton
    );

    reviewsButton.scrollIntoView({
        behavior: "auto",
        block: "center"
    });

    await new Promise(resolve =>
        setTimeout(resolve, 500)
    );

    // Count existing dialogs before click
    const dialogsBefore =
        Array.from(
            document.querySelectorAll(
                '[role="dialog"]'
            )
        ).filter(
            dialog => isVisibleElement(dialog)
        ).length;

    console.log(
        "Visible dialogs before Reviews click:",
        dialogsBefore
    );

    reviewsButton.click();

    console.log(
        "Reviews button clicked."
    );

    /*
     * Do NOT require [data-review-id] here.
     *
     * Google Maps may load the Reviews UI without
     * immediately creating review elements.
     */

    try {

        await waitForCondition(
            () => {

                // -----------------------------------------
                // 1. Review elements
                // -----------------------------------------

                const reviewElements =
                    document.querySelectorAll(
                        "[data-review-id]"
                    );

                if (
                    reviewElements.length > 0
                ) {

                    console.log(
                        "Review elements detected:",
                        reviewElements.length
                    );

                    return true;
                }


                // -----------------------------------------
                // 2. Review text
                // -----------------------------------------

                const reviewText =
                    document.querySelector(
                        ".wiI7pd"
                    );

                if (reviewText) {

                    console.log(
                        "Review text detected."
                    );

                    return true;
                }


                // -----------------------------------------
                // 3. Visible dialog
                // -----------------------------------------

                const dialogs =
                    Array.from(
                        document.querySelectorAll(
                            '[role="dialog"]'
                        )
                    ).filter(
                        dialog =>
                            isVisibleElement(dialog)
                    );

                if (
                    dialogs.length >
                    dialogsBefore
                ) {

                    console.log(
                        "New Google Maps dialog detected."
                    );

                    return true;
                }


                // -----------------------------------------
                // 4. Visible text containing Reviews
                // -----------------------------------------

                for (
                    const dialog of dialogs
                ) {

                    const text =
                        (
                            dialog.innerText ||
                            ""
                        )
                            .replace(
                                /\s+/g,
                                " "
                            )
                            .trim();

                    if (
                        /reviews?/i.test(
                            text
                        )
                    ) {

                        console.log(
                            "Reviews dialog detected by text."
                        );

                        return true;
                    }

                }


                // -----------------------------------------
                // 5. Review-related buttons
                // -----------------------------------------

                const reviewButtons =
                    Array.from(
                        document.querySelectorAll(
                            'button, [role="button"]'
                        )
                    ).filter(
                        element =>
                            isVisibleElement(element) &&
                            /reviews?/i.test(
                                (
                                    element.innerText ||
                                    element.getAttribute(
                                        "aria-label"
                                    ) ||
                                    ""
                                )
                            )
                    );

                if (
                    reviewButtons.length > 0
                ) {

                    console.log(
                        "Review-related UI detected:",
                        reviewButtons.length
                    );

                    return true;
                }


                return false;

            },
            15000,
            300
        );

        console.log(
            "Reviews UI detected."
        );

        await new Promise(resolve =>
            setTimeout(resolve, 1200)
        );

        console.log(
            "Current review elements:",
            document.querySelectorAll(
                "[data-review-id]"
            ).length
        );

        console.log(
            "Current dialogs:",
            document.querySelectorAll(
                '[role="dialog"]'
            ).length
        );

        return true;

    } catch (error) {

        console.error(
            "Reviews panel did not load:",
            error
        );

        // IMPORTANT DEBUG INFORMATION

        console.log(
            "========== REVIEW DEBUG =========="
        );

        console.log(
            "Current URL:",
            window.location.href
        );

        console.log(
            "data-review-id count:",
            document.querySelectorAll(
                "[data-review-id]"
            ).length
        );

        console.log(
            ".wiI7pd count:",
            document.querySelectorAll(
                ".wiI7pd"
            ).length
        );

        console.log(
            "Dialog count:",
            document.querySelectorAll(
                '[role="dialog"]'
            ).length
        );

        console.log(
            "=================================="
        );

        return false;
    }
}

function expandReviewTexts() {

    const reviewContainers =
        document.querySelectorAll(
            '[data-review-id]'
        );

    let expanded = 0;

    reviewContainers.forEach(
        review => {

            const buttons =
                review.querySelectorAll(
                    'button'
                );

            buttons.forEach(
                button => {

                    const text =
                        (
                            button.innerText ||
                            button.getAttribute(
                                "aria-label"
                            ) ||
                            ""
                        )
                            .trim();

                    if (
                        /^more$/i.test(text)
                    ) {

                        button.click();

                        expanded++;

                    }

                }
            );

        }
    );

    console.log(
        "Review texts expanded:",
        expanded
    );

}

function extractVisibleComments() {

    const comments = [];

    const reviewContainers =
        document.querySelectorAll(
            "[data-review-id]"
        );


    reviewContainers.forEach(
        (review) => {

            // ==================================================
            // REVIEW ID
            // ==================================================

            const reviewId =
                review.getAttribute(
                    "data-review-id"
                );


            if (!reviewId) {

                console.warn(
                    "Review without data-review-id found."
                );

                return;

            }


            // ==================================================
            // REVIEW TEXT
            // ==================================================

            let textElement =
                review.querySelector(
                    ".wiI7pd"
                );


            if (!textElement) {

                textElement =
                    review.querySelector(
                        '[data-expandable-section]'
                    );

            }


            if (!textElement) {

                textElement =
                    review.querySelector(
                        '[class*="review"]'
                    );

            }


            if (!textElement) {
                return;
            }


            const text =
                textElement.innerText
                    ?.trim() || "";


            if (!text) {
                return;
            }


            // ==================================================
            // CREATE REVIEW OBJECT
            // ==================================================

            comments.push(
                {
                    id:
                        reviewId,

                    text:
                        text
                }
            );

        }
    );


    return uniqueComments(
        comments
    );

}

function isScrollableElement(element) {

    if (!element) {
        return false;
    }

    const style =
        window.getComputedStyle(
            element
        );

    const overflowY =
        style.overflowY;

    const hasVerticalOverflow =
        element.scrollHeight >
        element.clientHeight + 20;

    const allowsScrolling =
        overflowY === "auto" ||
        overflowY === "scroll";

    return (
        hasVerticalOverflow &&
        allowsScrolling
    );
}


function findReviewScrollContainer() {

    const firstReview =
        document.querySelector(
            '[data-review-id]'
        );

    if (!firstReview) {

        console.log(
            "No review element found."
        );

        return null;
    }


    let current =
        firstReview.parentElement;


    while (
        current &&
        current !== document.body
    ) {

        if (
            isScrollableElement(
                current
            )
        ) {

            const reviewCount =
                current.querySelectorAll(
                    '[data-review-id]'
                ).length;


            if (
                reviewCount > 0
            ) {

                console.log(
                    "Review scroll container found:",
                    current
                );

                console.log(
                    "Reviews currently inside:",
                    reviewCount
                );

                return current;
            }

        }


        current =
            current.parentElement;

    }


    console.log(
        "Could not identify a dedicated review scroll container."
    );

    return null;
}

async function collectReviewsNormally() {

    console.log(
        "================================="
    );

    console.log(
        "COLLECTING NORMAL REVIEWS"
    );

    console.log(
        "================================="
    );

    expandReviewTexts();

    await new Promise(
        resolve =>
            setTimeout(
                resolve,
                500
            )
    );

    const comments =
        extractVisibleComments();

    console.log(
        "Normal review collection complete."
    );

    console.log(
        "Reviews collected:",
        comments.length
    );

    return comments;

}
async function scrollReviewsAndCollect() {

    console.log(
        "================================="
    );

    console.log(
        "FULL REVIEW COLLECTION STARTED"
    );

    console.log(
        "================================="
    );

    const container =
        findReviewScrollContainer();

    if (!container) {

        console.warn(
            "Review scroll container not found."
        );

        const fallback =
            extractVisibleComments();

        console.log(
            "Fallback reviews collected:",
            fallback.length
        );

        return fallback;
    }

    const allComments =
        new Map();

    let noNewReviewRounds = 0;

    const MAX_NO_NEW_ROUNDS = 3;

    const MAX_SCROLL_ROUNDS = 100;

    for (
        let i = 0;
        i < MAX_SCROLL_ROUNDS;
        i++
    ) {

        console.log(
            "---------------------------------"
        );

        console.log(
            `FULL REVIEW SCAN ${i + 1}/${MAX_SCROLL_ROUNDS}`
        );

        console.log(
            "---------------------------------"
        );

        const reviewsBefore =
            allComments.size;

        /*
         * Expand currently visible "More"
         * buttons before extracting reviews.
         */
        expandReviewTexts();

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    400
                )
        );

        /*
         * Extract currently visible reviews.
         */
        const visibleComments =
            extractVisibleComments();

        console.log(
            "Visible reviews:",
            visibleComments.length
        );
        console.log(
            "FIRST VISIBLE REVIEW:",
            visibleComments[0]
        );

        /*
         * Store reviews using Google's
         * data-review-id.
         */
        for (
            const comment of visibleComments
        ) {

            if (
                !comment ||
                !comment.id
            ) {

                continue;

            }

            const reviewId =
                String(
                    comment.id
                ).trim();

            if (!reviewId) {
                continue;
            }

            allComments.set(
                reviewId,
                {
                    ...comment,
                    id: reviewId
                }
            );

        }

        const reviewsAfter =
            allComments.size;

        const newReviews =
            reviewsAfter -
            reviewsBefore;

        console.log(
            "New reviews:",
            newReviews
        );

        console.log(
            "Total unique reviews:",
            reviewsAfter
        );

        /*
         * If this round discovered no new
         * review IDs, count a stable round.
         */
        if (
            newReviews === 0
        ) {

            noNewReviewRounds++;

        } else {

            noNewReviewRounds = 0;

        }

        console.log(
            "No-new-review rounds:",
            noNewReviewRounds
        );

        /*
         * Find current scroll position.
         */
        const beforeScrollTop =
            container.scrollTop;

        const maxScrollTop =
            Math.max(
                0,
                container.scrollHeight -
                container.clientHeight
            );

        /*
         * Check whether we are already
         * at the bottom.
         */
        const reachedBottom =
            beforeScrollTop >=
            maxScrollTop - 10;

        if (
            reachedBottom
        ) {

            console.log(
                "Review container reached bottom."
            );

            /*
             * Give Google Maps one final
             * chance to load reviews.
             */
            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        1200
                    )
            );

            const finalComments =
                extractVisibleComments();

            for (
                const comment of finalComments
            ) {

                if (
                    comment &&
                    comment.id
                ) {

                    const reviewId =
                        String(
                            comment.id
                        ).trim();

                    if (reviewId) {

                        allComments.set(
                            reviewId,
                            {
                                ...comment,
                                id: reviewId
                            }
                        );

                    }

                }

            }

            console.log(
                "Final review count:",
                allComments.size
            );

            break;
        }

        /*
         * Stop only after several rounds
         * produce no new review IDs.
         */
        if (
            noNewReviewRounds >=
            MAX_NO_NEW_ROUNDS
        ) {

            console.log(
                "No new review IDs detected for several rounds."
            );

            console.log(
                "Stopping full review collection."
            );

            break;
        }

        /*
         * Scroll close to the next section
         * of reviews.
         */
        const scrollAmount =
            Math.max(
                500,
                container.clientHeight * 0.8
            );

        const targetScrollTop =
            Math.min(
                beforeScrollTop +
                scrollAmount,
                maxScrollTop
            );

        console.log(
            "Scrolling review container:",
            {
                from:
                    beforeScrollTop,

                to:
                    targetScrollTop,

                max:
                    maxScrollTop
            }
        );

        container.scrollTo({
            top:
                targetScrollTop,

            behavior:
                "auto"
        });

        /*
         * Wait for Google Maps to load
         * newly visible reviews.
         */
        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    1200
                )
        );
    }

    const result =
        [
            ...allComments.values()
        ];

    console.log(
        "================================="
    );

    console.log(
        "FULL REVIEW COLLECTION FINISHED"
    );

    console.log(
        "TOTAL UNIQUE REVIEWS:",
        result.length
    );

    console.log(
        "================================="
    );

    return result;

}
async function extractReviewsForBusiness(
    collectFullReviews = false
) {

    console.log(
        "================================="
    );

    console.log(
        "REVIEW COLLECTION MODE"
    );

    console.log(
        "Full Reviews:",
        collectFullReviews
    );

    console.log(
        "================================="
    );

    if (
        collectFullReviews
    ) {

        return await scrollReviewsAndCollect();

    }

    return await collectReviewsNormally();

}
async function closeReviewsPanelIfOpen() {

    console.log(
        "Checking whether Reviews UI is open..."
    );

    const dialogs =
        Array.from(
            document.querySelectorAll(
                '[role="dialog"]'
            )
        ).filter(
            dialog =>
                isVisibleElement(dialog)
        );

    console.log(
        "Visible dialogs:",
        dialogs.length
    );

    let reviewDialog = null;

    for (
        const dialog of dialogs
    ) {

        const text =
            (
                dialog.innerText ||
                ""
            )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();

        if (
            /reviews?/i.test(text)
        ) {

            reviewDialog =
                dialog;

            break;
        }
    }

    const reviewElements =
        document.querySelectorAll(
            "[data-review-id]"
        );

    /*
     * If there is no review dialog and no review
     * element, there is nothing to close.
     */

    if (
        !reviewDialog &&
        reviewElements.length === 0
    ) {

        console.log(
            "Reviews UI does not appear to be open."
        );

        return false;
    }

    console.log(
        "Reviews UI appears to be open."
    );


    // --------------------------------------------------
    // Find Back button inside review dialog
    // --------------------------------------------------

    let backButton = null;

    if (reviewDialog) {

        const buttons =
            Array.from(
                reviewDialog.querySelectorAll(
                    'button, [role="button"]'
                )
            ).filter(
                button =>
                    isVisibleElement(button)
            );

        for (
            const button of buttons
        ) {

            const label =
                (
                    button.getAttribute(
                        "aria-label"
                    ) ||
                    button.innerText ||
                    ""
                )
                    .trim();

            if (
                /back|close/i.test(
                    label
                )
            ) {

                backButton =
                    button;

                break;
            }
        }
    }


    // --------------------------------------------------
    // Fallback: visible Back buttons
    // --------------------------------------------------

    if (!backButton) {

        const buttons =
            Array.from(
                document.querySelectorAll(
                    'button, [role="button"]'
                )
            ).filter(
                button =>
                    isVisibleElement(button)
            );

        for (
            const button of buttons
        ) {

            const label =
                (
                    button.getAttribute(
                        "aria-label"
                    ) ||
                    button.innerText ||
                    ""
                )
                    .trim();

            if (
                /back/i.test(
                    label
                )
            ) {

                backButton =
                    button;

                break;
            }
        }
    }


    if (!backButton) {

        console.warn(
            "Reviews UI appears open, but no Back/Close button was found."
        );

        return false;
    }


    console.log(
        "Closing Reviews UI..."
    );

    backButton.click();

    await new Promise(resolve =>
        setTimeout(resolve, 1000)
    );

    console.log(
        "Reviews UI close action completed."
    );

    return true;
}

// ======================================================
// FUNCTION: Extract visible photo/image URLs
// ======================================================

function extractVisiblePhotoLinks() {

    const links =
        new Set();


    // ==================================================
    // 1. Google Maps photo page links
    // ==================================================

    const anchors =
        document.querySelectorAll(
            'a[href]'
        );


    anchors.forEach(
        anchor => {

            const href =
                anchor.href || "";

            const aria =
                anchor.getAttribute(
                    "aria-label"
                ) || "";

            const text =
                anchor.innerText?.trim() || "";


            if (
                href.includes(
                    "/photos"
                ) ||
                /photo/i.test(
                    aria
                ) ||
                /photo/i.test(
                    text
                )
            ) {

                if (
                    href.startsWith(
                        "http"
                    )
                ) {

                    links.add(
                        href
                    );

                }

            }

        }
    );


    // ==================================================
    // 2. Actual image URLs
    // ==================================================

    const images =
        document.querySelectorAll(
            "img"
        );


    images.forEach(
        image => {

            // currentSrc is preferable because
            // Google may use responsive images

            const imageUrl =
                image.currentSrc ||
                image.src ||
                "";


            if (!imageUrl) {
                return;
            }


            // ------------------------------------------
            // Ignore extension / UI images
            // ------------------------------------------

            if (
                imageUrl.startsWith(
                    "data:"
                )
            ) {

                return;

            }


            // ------------------------------------------
            // Google-hosted image URLs
            // ------------------------------------------

            if (
                imageUrl.includes(
                    "googleusercontent.com"
                ) ||
                imageUrl.includes(
                    "ggpht.com"
                )
            ) {

                links.add(
                    imageUrl
                );

            }

        }
    );


    // ==================================================
    // 3. Images inside photo links
    // ==================================================

    images.forEach(
        image => {

            const parentLink =
                image.closest(
                    'a[href]'
                );


            if (
                !parentLink
            ) {

                return;

            }


            const href =
                parentLink.href || "";


            if (
                href.includes(
                    "/photos"
                )
            ) {

                const imageUrl =
                    image.currentSrc ||
                    image.src ||
                    "";


                if (
                    imageUrl
                ) {

                    links.add(
                        imageUrl
                    );

                }

            }

        }
    );


    const result =
        [
            ...links
        ];


    console.log(
        "Actual photo/image URLs found:",
        result.length
    );


    console.log(
        "Photo URLs:",
        result
    );


    return result;

}

// ======================================================
// LOAD LARAVEL EXTRACTION CONFIGURATION
// ======================================================
async function loadExtractionConfig() {

    const result =
        await chrome.storage.local.get(
            ["extractionConfig"]
        );

    const config =
        result.extractionConfig || {};

    const jobId =
        Number(config.jobId);

    const sourceId =
        Number(config.sourceId);

    if (!jobId || !sourceId) {

        throw new Error(
            "Laravel extraction configuration is missing. " +
            "Please save Job ID and Source ID from the extension popup."
        );

    }

    const collectReviews =
        config.collectReviews !== false;

    const collectFullReviews =
        collectReviews &&
        config.collectFullReviews === true;

    const finalConfig = {

        jobId,

        sourceId,

        searchQuery:
            config.searchQuery || "",

        collectBusinessDetails:
            config.collectBusinessDetails !== false,

        collectReviews,

        collectFullReviews,

        collectPhotos:
            config.collectPhotos !== false

    };

    console.log(
        "================================="
    );

    console.log(
        "LARAVEL EXTRACTION CONFIG"
    );

    console.log(
        "================================="
    );

    console.log(
        finalConfig
    );

    console.log(
        "Reviews:",
        finalConfig.collectReviews
    );

    console.log(
        "Full Reviews:",
        finalConfig.collectFullReviews
    );

    console.log(
        "================================="
    );

    return finalConfig;

}