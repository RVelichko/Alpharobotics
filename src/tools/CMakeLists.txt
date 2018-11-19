set(APP_WS_SAVER wsock-json-saver-server)
add_executable(${APP_WS_SAVER}
    ws_json_saver.cpp
    )
target_link_libraries(${APP_WS_SAVER}
    log
    websocketserver
    pthread
    ssl
    crypto
    ${JSONCPP_STATIC_LIBRARIES}
    ${Boost_LIBRARIES}
    ${CMAKE_THREAD_LIBS_INIT}
    )


set(APP_WS_FILE_UPLOADER wsock-file-uploader-server)
add_executable(${APP_WS_FILE_UPLOADER}
    ws_file_uploader.cpp
    )
target_link_libraries(${APP_WS_FILE_UPLOADER}
    log
    websocketserver
    ssl
    crypto
    ${JSONCPP_STATIC_LIBRARIES}
    ${Boost_LIBRARIES}
    ${CMAKE_THREAD_LIBS_INIT}
    )

set(APP_WSROBOT wsock-robot-server)
add_executable(${APP_WSROBOT}
    ws_robot_server.cpp
    )
target_link_libraries(${APP_WSROBOT}
    log
    ssl
    crypto
    curl
    websocketserver
    ${JSONCPP_STATIC_LIBRARIES}
    ${Boost_LIBRARIES}
    ${CMAKE_THREAD_LIBS_INIT}
    ${Gumbo_static_LIBRARY}
    )

set(APP_WSSS wsock-signaling-server)
add_executable(${APP_WSSS}
    ws_signaling_server.cpp
    )
target_link_libraries(${APP_WSSS}
    log
    websocketserver
    ssl
    crypto
    ${JSONCPP_STATIC_LIBRARIES}
    ${Boost_PROGRAM_OPTIONS_LIBRARY}
    ${Boost_REGEX_LIBRARY}
    ${Boost_SYSTEM_LIBRARY}
    ${CMAKE_THREAD_LIBS_INIT}
    )


set(APP_WSFS wsock-frame-server)
add_executable(${APP_WSFS}
    ws_frame_server.cpp
    )
target_link_libraries(${APP_WSFS}
    log
    websocketserver
    ssl
    crypto
    ${JSONCPP_STATIC_LIBRARIES}
    ${Boost_PROGRAM_OPTIONS_LIBRARY}
    ${Boost_REGEX_LIBRARY}
    ${Boost_SYSTEM_LIBRARY}
    ${CMAKE_THREAD_LIBS_INIT}
    )

