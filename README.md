# kata-elm-attack-vectors
Exploring ways to attack an Elm 0.19.0 app in a compromised JS environment

## What do I do?
* Install [NodeJS](https://nodejs.org)
* Run `yarn install && yarn build && yarn start`, `npm` will work too
* Visit the served page in the browser of your choice at http://localhost:5000
* You'll be presented with the scenarios compromising the sample app located in `src/App.elm`

## Potential other ways?
* Proxy
* `Json.Decode.Value` with side-effects
* webworker
* Monkey patch `XMLHttpRequest` etc.
* `localStorage`
