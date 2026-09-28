console.log("✅ api.js loaded successfully");

const LARAVEL_API_BASE = "http://127.0.0.1:8000";

async function sendBusinessToLaravel({
    jobId,
    sourceId,
    business,
    reviews = [],
    photos = []
}) {

    const payload = {

        job_id: jobId,

        source_id: sourceId,

        business: {

            name: business.name || "",

            category: business.category || null,

            address: business.address || null,

            phone: business.phone || null,

            website: business.website || null,

            rating:
                business.rating !== undefined &&
                business.rating !== null
                    ? Number(business.rating)
                    : null,

            review_count:
                typeof business.reviews === "number"
                    ? business.reviews
                    : 0,

            maps_url:
                business.mapsUrl ||
                business.maps_url ||
                null,

            external_id:
                business.external_id ||
                business.id ||
                null
        },


        reviews: reviews.map(review => ({

            external_review_id:
                review.id || null,

            author:
                review.author || "Unknown",

            rating:
                review.rating !== undefined &&
                review.rating !== null
                    ? Number(review.rating)
                    : null,

            review_date:
                review.date || null,

            review_text:
                review.text || null,

            owner_response:
                review.ownerResponse || null,

            source_url:
                business.mapsUrl || null
        })),


        photos: photos.map(photo => ({

            photo_key:
                typeof photo === "string"
                    ? photo
                    : (
                        photo.key ||
                        photo.id ||
                        null
                    ),

            photo_url:
                typeof photo === "string"
                    ? photo
                    : photo.url,

            photo_type: "business",

            source_url:
                business.mapsUrl || null
        }))
    };


    console.log(
        "Sending business to extension service worker:",
        payload
    );


    const response = await chrome.runtime.sendMessage({

        type: "IMPORT_BUSINESS",

        payload: payload

    });


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


    console.log(
        "Laravel import successful:",
        response.data
    );


    return response.data;
}

async function testLaravelConnection() {

    console.log(
        "🧪 Running Laravel connection test..."
    );


    const testBusiness = {

        id: "extension-test-001",

        name: "Chrome Extension Test Restaurant",

        category: "Restaurant",

        address: "Nagpur, Maharashtra",

        phone: "9876543210",

        website: "https://example.com",

        rating: 4.5,

        reviews: 25,

        mapsUrl: "https://www.google.com/maps/"
    };


    const testReviews = [

        {
            id: "extension-review-001",

            author: "Test User",

            rating: 5,

            date: "2026-09-20",

            text: "Testing Chrome extension integration.",

            ownerResponse: null
        }

    ];


    const testPhotos = [

        {
            id: "extension-photo-001",

            url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4"
        }

    ];


    try {

        const result =
            await sendBusinessToLaravel({

                jobId: 1,

                sourceId: 1,

                business: testBusiness,

                reviews: testReviews,

                photos: testPhotos

            });


        console.log(
            "✅ Laravel connection test successful:",
            result
        );


    } catch (error) {

        console.error(
            "❌ Laravel connection test failed:",
            error
        );

    }
}
setTimeout(() => {
    testLaravelConnection();
}, 3000);
console.log("✅ sendBusinessToLaravel is available inside content-script world");
