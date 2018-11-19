set(APP_LIB consultant)
add_library(${APP_LIB}
    ConsultantServer.cpp
    )


set(APP_BIN consultant-server)
add_executable(${APP_BIN}
    main.cpp
    )
target_link_libraries(${APP_BIN}
    ${APP_LIB}
    )
