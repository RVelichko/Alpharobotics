set(APP_LIB foodprod_classifier)
add_library(${APP_LIB}
    ColorsTransformation.cpp
    FourierTransformation.cpp
    ContouresTransformation.cpp
    ShiTomasiCornerDetectionTransformation.cpp
    NbClassifierModel.cpp
    NbClassifier.cpp
    FoodprodClassifier.cpp
    BaseClassifierWorker.cpp
    FoodprodClassifierWorker.cpp
    AddFoodprodClassifierWorker.cpp
    )


set(APP_BIN foodprod-classifier-server)
add_executable(${APP_BIN}
    main.cpp
    )
target_link_libraries(${APP_BIN}
    -Wl,-Bdynamic pthread
    -Wl,-Bdynamic ssl
    -Wl,-Bdynamic crypto
    -Wl,-Bdynamic ${APP_LIB}

    #-Wl,-Bstatic ${APP_LIB}
    -Wl,-Bstatic log
    -Wl,-Bstatic algorithm
    -Wl,-Bstatic websocketserver
    -Wl,-Bstatic ${JSONCPP_STATIC_LIBRARIES}
    -Wl,-Bdynamic ${Boost_LIBRARIES}
    -Wl,-Bdynamic ${OpenCV_LIBS}
    )
