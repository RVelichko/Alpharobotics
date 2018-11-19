set(APP_LIB audio_to_text)
add_library(${APP_LIB}
    AudioToTextServer.cpp
    )


set(APP_BIN audio-to-text-server)
add_executable(${APP_BIN}
    main.cpp
    )
target_link_libraries(${APP_BIN}
    ${APP_LIB}
    )
