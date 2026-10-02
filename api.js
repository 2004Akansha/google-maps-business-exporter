// ======================================================
// GOOGLE MAPS BUSINESS EXPORTER - api.js
// Laravel Data Adapter
// ======================================================

console.log("✅ api.js loaded successfully");


// ======================================================
// LARAVEL API CONFIGURATION
// ======================================================

const LARAVEL_API_BASE =
    "http://127.0.0.1:8000";


// ======================================================
// SEND BUSINESS DATA TO LARAVEL
// ======================================================
//
// This function receives REAL data extracted by content.js.
//
// content.js
//     ↓
// sendBusinessToLaravel()
//     ↓
// service-worker.js
//     ↓
// Laravel API
//
// ======================================================

async function sendBusinessToLaravel({
    jobId,
    sourceId,
    business,
    reviews = [],
    photos = []
}) {

    // --------------------------------------------------
    // Validate Job ID
    // --------------------------------------------------

    if (!jobId) {

        throw new Error(
            "Missing Laravel Job ID."
        );

    }


    // --------------------------------------------------
    // Validate Source ID
    // --------------------------------------------------

    if (!sourceId) {

        throw new Error(
            "Missing Laravel Source ID."
        );

    }


    // --------------------------------------------------
    // Validate business
    // --------------------------------------------------

    if (!business) {

        throw new Error(
            "Business data is missing."
        );

    }


    if (!business.name) {

        throw new Error(
            "Business name is missing."
        );

    }


    // ==================================================
    // BUILD LARAVEL BUSINESS DATA
    // ==================================================

    const laravelBusiness = {

        name:
            business.name || "",

        category:
            business.category || null,

        address:
            business.address || null,

        phone:
            business.phone || null,

        website:
            business.website || null,

        rating:
            business.rating !== undefined &&
            business.rating !== null &&
            business.rating !== ""
                ? Number(business.rating)
                : null,

        review_count:
            typeof business.reviews === "number"
                ? business.reviews
                : (
                    Number(
                        String(
                            business.reviews || "0"
                        ).replace(/,/g, "")
                    ) || 0
                ),

        maps_url:
            business.mapsUrl ||
            business.maps_url ||
            null,

        external_id:
            business.external_id ||
            business.id ||
            normalizeMapsUrl(
                business.mapsUrl ||
                business.maps_url ||
                ""
            ) ||
            null
    };


    // ==================================================
    // BUILD LARAVEL REVIEWS
    // ==================================================

    const laravelReviews =
        Array.isArray(reviews)
            ? reviews.map((review, index) => {

                return {

                    external_review_id:
                        review.id ||
                        review.external_review_id ||
                        `review-${index}-${Date.now()}`,

                    author:
                        review.author ||
                        "Google Maps User",

                    rating:
                        review.rating !== undefined &&
                        review.rating !== null &&
                        review.rating !== ""
                            ? Number(review.rating)
                            : null,

                    review_date:
                        review.date ||
                        review.review_date ||
                        null,

                    review_text:
                        review.text ||
                        review.review_text ||
                        "",

                    owner_response:
                        review.ownerResponse ||
                        review.owner_response ||
                        null,

                    source_url:
                        business.mapsUrl ||
                        business.maps_url ||
                        null

                };

            })
            : [];


    // ==================================================
    // BUILD LARAVEL PHOTOS
    // ==================================================

    const laravelPhotos =
        Array.isArray(photos)
            ? photos
                .map((photo, index) => {

                    const photoUrl =
                        typeof photo === "string"
                            ? photo
                            : (
                                photo?.url ||
                                photo?.photo_url ||
                                ""
                            );


                    const photoKey =
                        typeof photo === "string"
                            ? photoUrl
                            : (
                                photo?.key ||
                                photo?.photo_key ||
                                photo?.id ||
                                photoUrl ||
                                `photo-${index}-${Date.now()}`
                            );


                    return {

                        photo_key:
                            photoKey,

                        photo_url:
                            photoUrl,

                        photo_type:
                            "business",

                        source_url:
                            business.mapsUrl ||
                            business.maps_url ||
                            null

                    };

                })
                .filter(photo => photo.photo_url)
            : [];


    // ==================================================
    // FINAL LARAVEL PAYLOAD
    // ==================================================

    const payload = {

        job_id:
            Number(jobId),

        source_id:
            Number(sourceId),

        business:
            laravelBusiness,

        reviews:
            laravelReviews,

        photos:
            laravelPhotos

    };


    // ==================================================
    // LOG REAL DATA
    // ==================================================

    console.log(
        "================================="
    );

    console.log(
        "SENDING REAL MAPS DATA TO LARAVEL"
    );

    console.log(
        "================================="
    );

    console.log(
        "Business:",
        laravelBusiness
    );

    console.log(
        "Reviews:",
        laravelReviews.length
    );

    console.log(
        "Photos:",
        laravelPhotos.length
    );

    console.log(
        "Laravel payload:",
        payload
    );


    // ==================================================
    // SEND TO EXTENSION SERVICE WORKER
    // ==================================================

    const response =
        await chrome.runtime.sendMessage({

            type:
                "IMPORT_BUSINESS",

            payload:
                payload

        });


    // ==================================================
    // VALIDATE SERVICE WORKER RESPONSE
    // ==================================================

    if (!response) {

        throw new Error(
            "No response received from extension service worker."
        );

    }


    if (!response.success) {

        throw new Error(
            response.error ||
            "Laravel import failed."
        );

    }


    // ==================================================
    // SUCCESS
    // ==================================================

    console.log(
        "✅ Real Maps business imported into Laravel:",
        response.data
    );


    return response.data;

}


// ======================================================
// NORMALIZE GOOGLE MAPS URL
// ======================================================
//
// Used as a fallback external_id when the extractor
// does not provide a stable business ID.
//
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

        console.warn(
            "Failed to normalize Maps URL:",
            error
        );

        return url;

    }

}


// ======================================================
// READY
// ======================================================

console.log(
    "✅ sendBusinessToLaravel is ready for real Maps data."
);