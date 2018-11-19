set(APP_LIB chat-bot)
add_library(${APP_LIB}
    ChatBotServer.cpp
    )


set(APP_BIN chat-bot-server)
add_executable(${APP_BIN}
    main.cpp
    )
target_link_libraries(${APP_BIN}
    ${APP_LIB}
    )
