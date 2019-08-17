module App exposing (main)

import Browser
import Html exposing (Html, button, div, pre, text)
import Html.Attributes as Attr exposing (class)
import Html.Events as Events exposing (onClick)


type alias Model =
    { count : Int
    , isCompromised : Bool
    , privateKey : String
    }


type Msg
    = SomeButtonClicked


init : () -> ( Model, Cmd Msg )
init _ =
    ( { count = 0
      , isCompromised = False
      , privateKey = "MY_SECRET_PRIVATE_KEY"
      }
    , Cmd.none
    )


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.none


update : Msg -> Model -> ( Model, Cmd Msg )
update msg ({ count } as model)=
    case msg of
        SomeButtonClicked ->
            ( { model | count = count + 1 }, Cmd.none )


sign : String -> String -> String
sign privateKey data =
    data
        ++ (" (signed-with " ++ privateKey ++ ")")
        |> String.replace " " "+"


view : Model -> Html Msg
view { isCompromised, privateKey } =
    let
        signed =
            sign privateKey "topsecret.read topsecret.write"
    in
    div [ class "border border-gray-400 m-4" ]
        [ div [ class "border-b bg-gray-200 border-gray-400 p-2" ]
            [ text "Elm App"
            , if isCompromised then
                text " (compromised)"
              else
                text ""
            ]
        , pre [ class "p-2" ]
            [ text ("Token " ++ signed)
            ]
        , div [ class "p-2" ]
            [ button [ class "bg-gray-200 border border-gray-400 hover:bg-gray-100 pt-1 pr-2 pb-1 pl-2 rounded", onClick SomeButtonClicked ]
                [ text "Some button"
                ]
            ]
        ]


main : Program () Model Msg
main =
    Browser.element
        { init = init
        , subscriptions = subscriptions
        , update = update
        , view = view
        }
