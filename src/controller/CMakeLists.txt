set(APP_LIB controller)
add_library(${APP_LIB}
    ControllerServer.cpp
    )


set(APP_BIN controller-server)
add_executable(${APP_BIN}
    main.cpp
    )
target_link_libraries(${APP_BIN}
    ${APP_LIB}
    )
