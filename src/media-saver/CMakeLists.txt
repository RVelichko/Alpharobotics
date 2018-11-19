set(APP_LIB media_saver)
add_library(${APP_LIB}
    MediaSaverServer.cpp
    )


set(APP_BIN media-saver-server)
add_executable(${APP_BIN}
    main.cpp
    )
target_link_libraries(${APP_BIN}
    ${APP_LIB}
    )
