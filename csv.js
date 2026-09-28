// ======================================================
// GOOGLE MAPS BUSINESS EXPORTER - csv.js
// ======================================================


// ======================================================
// FUNCTION: Convert comments array to CSV cell value
// Supports both old string format and new object format
// ======================================================

function commentsToCSVValue(comments) {

    if (
        !Array.isArray(comments)
    ) {

        return "";

    }


    return comments
        .map(
            comment => {

                // --------------------------------------------------
                // Old format:
                // "Good food"
                // --------------------------------------------------

                if (
                    typeof comment === "string"
                ) {

                    return comment.trim();

                }


                // --------------------------------------------------
                // New format:
                // {
                //     id: "...",
                //     text: "Good food"
                // }
                // --------------------------------------------------

                if (
                    comment &&
                    typeof comment === "object"
                ) {

                    return (
                        comment.text || ""
                    )
                        .toString()
                        .trim();

                }


                return "";

            }
        )
        .filter(
            text => text !== ""
        )
        .join("\n\n");

}


// ======================================================
// FUNCTION: Convert business data to CSV
// ======================================================

function convertToCSV(data) {

    // ==================================================
    // CSV COLUMN HEADINGS
    // ==================================================

    const headers = [

        "Name",

        "Category",

        "Address",

        "Phone",

        "Website",

        "Rating",

        "Reviews",

        "Comments",

        "Photos URL",

        "Photo Links",

        "Google Maps URL"

    ];


    // ==================================================
    // CREATE CSV ROWS
    // ==================================================

    const rows =
        data.map(
            item => [

                item.name || "",

                item.category || "",

                item.address || "",

                item.phone || "",

                item.website || "",

                item.rating || "",

                item.reviews || "",


                // ------------------------------------------
                // Comments
                // ------------------------------------------

                commentsToCSVValue(
                    item.comments
                ),

 
                item.photosUrl || "",

                // ------------------------------------------
                // Photo links
                // ------------------------------------------

                Array.isArray(
                    item.photoLinks
                )
                    ? item.photoLinks.join("\n")
                    : "",


                // ------------------------------------------
                // Google Maps URL
                // ------------------------------------------

                item.mapsUrl || ""

            ]
        );


    // ==================================================
    // COMBINE HEADERS + DATA
    // ==================================================

    return [

        headers,

        ...rows

    ]

        // ==================================================
        // CONVERT EACH ROW INTO CSV FORMAT
        // ==================================================

        .map(
            row =>

                row
                    .map(
                        value =>

                            // ----------------------------------
                            // Escape double quotes
                            // ----------------------------------

                            `"${String(value)
                                .replace(/"/g, '""')}"`
                    )
                    .join(",")

        )

        // ==================================================
        // SEPARATE ROWS
        // ==================================================

        .join("\n");

}