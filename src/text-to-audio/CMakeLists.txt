set(APP_LIB tts)
add_library(${APP_LIB}
    TTSService_types.cpp
    TTSService_constants.cpp
    TTSService.cpp
    )


set(APP_SRV tts-server)
add_executable(${APP_SRV}
    TTSServer.cpp
    )
target_link_libraries(${APP_SRV}
    ${APP_LIB}
    log
    service_handler
    ${Boost_LIBRARIES}
    ${Thrift_LIBRARIES}
    event
    )


set(APP_CLT tts-client)
add_executable(${APP_CLT}
    TTSClient.cpp
    )
target_link_libraries(${APP_CLT}
    ${APP_LIB}
    log
    ${Boost_LIBRARIES}
    ${Thrift_LIBRARIES}
    )

set(APP_WEB_SRV web-tts-server)
add_executable(${APP_WEB_SRV}
    WebTTSServer.cpp
    )
target_link_libraries(${APP_WEB_SRV}
    log
    ${WTHTTP_LIBRARIES}
    ${WTEXT_LIBRARIES}
    ${WT_LIBRARIES}
    ${Boost_LIBRARIES}
    )
add_dependencies(${APP_WEB_SRV} "${WINE_TTS_SERVER_BIN}")
configure_file(${TEXT_TO_AUDIO}/rus_locale.xml ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/rus_locale.xml COPYONLY)
configure_file(${TEXT_TO_AUDIO}/main.css ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/main.css COPYONLY)
