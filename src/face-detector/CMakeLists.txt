set(APP_LIB face_detector)
add_library(${APP_LIB}
    FaceDetectorServer.cpp
    )


set(APP_BIN face-detector-server)
add_executable(${APP_BIN}
    main.cpp
    )
target_link_libraries(${APP_BIN}
    ${APP_LIB}
    )
