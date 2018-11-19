/*!
 * \brief Приложение тестового использования демонстрационного приложения NUANCE vatodemo.exe, посредствам wine
 * \author Ростислав Величко
 * \date 07.12.15
 */

// Пример сборки:
// # i586-mingw32msvc-g++ -I /usr/i586-mingw32msvc/include/ wine_nuance_vautodemo_server.cpp -L /usr/i586-mingw32msvc/lib -lWs2_32

// Пример запуска:
// # ./a.exe ~/.wine/drive_c/Program\ Files\ \(x86\)/Nuance/Vocalizer\ for\ Automotive\ v5/common/speech/components/vautodemo.exe
//           cp1251_text.txt

#undef UNICODE
#define WIN32_LEAN_AND_MEAN
#define _WIN32_WINNT 0x501

#include <windows.h>
#include <winuser.h>
#include <winsock2.h>
#include <ws2tcpip.h>

#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <list>


namespace arobot {
namespace tools {

static const size_t WAIT_WINDOW_TIME_MLS = 5000;
static const size_t MAX_WIN_CLASS_NAME_LEN = 100;
static const size_t PLAY_BT_POS_X = 175;
static const size_t STOP_BT_POS_X = 220;
static const size_t TBAR_BT_POS_Y = 60;

/**
 * \brief Класс реализующий доступ к приложению vautodemo.exe и переачу текста с последующим проигрыванием его голосом.
 */
class StartVautodemo {
    bool _is_success;        ///< Флаг успешности запуска приложения vautodemo.exe
    STARTUPINFO _si;         ///< Переменная настроек свойст запускаемого процесса
    PROCESS_INFORMATION _pi; ///< Переменная, заполняемая windows с информацией о запущенном процессе
    HWND _hwnd;              ///< Идентификатор основного окна
    HWND _text_hwnd;         ///< Идентификатор текстового окна

    /**
     * \brief Структура для сбора информации об открытых окнах, принадлежащих запущенному процессу.
     */
    struct SParams {
        DWORD _pid;             ///< Идентификатор процесса
        std::list<HWND> _hwnds; ///< Список найденных идентификаторов окон

        SParams(DWORD pid)
            : _pid(pid)
        {}
    };

    /**
     * \brief Метод, необходимы для работы поисковой функции EnumWindow.
     *
     * \param hwnd    Идентификатор очередного найденного окна
     * \param lparam  Адрес заполняемой найденными идентификаторами окон структуры
     */
    static BOOL CALLBACK enumWindowsProc(HWND hwnd, LPARAM lparam) {
        SParams *params = (SParams*)lparam;
        DWORD pid = 0;
        GetWindowThreadProcessId(hwnd, &pid);
        if(params->_pid == pid) {
            params->_hwnds.push_back(hwnd);
        }
        return TRUE;
    }

    /**
     * \brief Метод, Возвращающий идентификатор окна приложения vautodemo.exe, после его запуска.
     *
     * \param pid Идентификатор процесса приложения vautodemo.exe
     */
    HWND getVautodemoWindow(DWORD pid) {
        char need_win[] = "Nuance Vocalizer for Automotive - Text1";
        char cur_win[sizeof(need_win)] = {0};
        HWND hwnd = 0;
        DWORD ticks = GetTickCount();
        while (not hwnd and (ticks + WAIT_WINDOW_TIME_MLS) > GetTickCount()) {
            SParams params(pid);
            if (EnumWindows(enumWindowsProc, (LPARAM)&params)) {
                for (std::list<HWND>::iterator iter = params._hwnds.begin(); iter not_eq params._hwnds.end(); ++iter) {
                    GetWindowText(*iter, cur_win, sizeof(cur_win));
                    if (strncmp(cur_win, need_win, sizeof(need_win)) == 0) {
                        hwnd = *iter;
                    }
                    Sleep(1);
                }
            }
        }
        return hwnd;
    }

    /**
     * \brief Метод, Возвращающий идентификатор окна для вывода текста, после его запуска.
     *
     * \param hwnd Идентификатор окна всего приложения vautodemo.exe
     */
    HWND getVautodemoTextWindow(HWND hwnd) {
        char need_win[] = "Text1";
        char cur_win[sizeof(need_win)] = {0};
        HWND child = 0;
        DWORD ticks = GetTickCount();
        while (not child and (ticks + WAIT_WINDOW_TIME_MLS) > GetTickCount()) {
            hwnd = GetWindow(hwnd, GW_CHILD);
            GetWindowText(hwnd, cur_win, sizeof(cur_win));
            if (strncmp(cur_win, need_win, sizeof(need_win)) == 0) {
                child = GetWindow(hwnd, GW_CHILD);
            }
            Sleep(1);
        }
        return child;
    }

    /**
     * \brief Метод, эмуляции нажатия кнопки плей.
     */
    void play() {
        RECT rc = {0};
        GetWindowRect(_hwnd, &rc);
        if (rc.right - rc.left < 250 and  rc.bottom - rc.left < 100) {
            rc.left = 0;
            rc.top = 0;
            rc.right = 250;
            rc.bottom = 100;
            MoveWindow(_hwnd, rc.left, rc.top, rc.right, rc.bottom, FALSE);
        }
        SetCursorPos(rc.left + PLAY_BT_POS_X, rc.top + TBAR_BT_POS_Y);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }

    /**
     * \brief Метод, эмуляции нажатия кнопки стоп.
     */
    void stop() {
        RECT rc = {0};
        GetWindowRect(_hwnd, &rc);
        if (rc.right - rc.left < 250 and  rc.bottom - rc.left < 100) {
            rc.left = 0;
            rc.top = 0;
            rc.right = 250;
            rc.bottom = 100;
            MoveWindow(_hwnd, rc.left, rc.top, rc.right, rc.bottom, FALSE);
        }
        SetCursorPos(rc.left + STOP_BT_POS_X, rc.top + TBAR_BT_POS_Y);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
    }

public:
    StartVautodemo(const std::string &path)
        : _is_success(false)
        , _hwnd(0)
        , _text_hwnd(0) {
        ZeroMemory(&_si, sizeof(_si));
        _si.cb = sizeof(_si);
        ZeroMemory(&_pi, sizeof(_pi));
        _is_success = CreateProcess(NULL, const_cast<CHAR*>(path.c_str()), NULL, NULL, FALSE, 0, NULL, NULL, &_si, &_pi);
        _hwnd = getVautodemoWindow(_pi.dwProcessId);
        _text_hwnd = getVautodemoTextWindow(_hwnd);
    }

    ~StartVautodemo() {
        if (_is_success) {
            PostMessage(_hwnd, WM_CLOSE, 0, 0);
            WaitForSingleObject(_pi.hProcess, INFINITE);
            CloseHandle(_pi.hProcess);
            CloseHandle(_pi.hThread);
        }
    }

    bool is_ready() {
        return _hwnd not_eq 0 and _text_hwnd not_eq 0;
    }

    void textToAudio(const std::string data) {
        std::cout << "TTS play: \"" << data << "\"\n";
        SetForegroundWindow(_hwnd);
        stop();
        Sleep(100);
        SendMessage(_text_hwnd, WM_SETTEXT, NULL, (LPARAM)(const char*)data.c_str());
        Sleep(100);
        play();
    }
};


static const size_t DEFAULT_BUFLEN = TTS_WRAPPER_BUFFER_LENGTH;
static const size_t DEFAULT_PORT = TTS_WRAPPER_PORT;

/**
 * \brief Класс реализующий сетевой доступ к данному приложению только для одного клиента.
 */
class Server {
    SOCKET _listen_sock;
    SOCKET _client_sock;
    bool _is_ready;

public:
    Server(int port = DEFAULT_PORT)
        : _listen_sock(INVALID_SOCKET)
        , _client_sock(INVALID_SOCKET)
        , _is_ready(false) {
        WSADATA wsa_data;
        int sock_start_result = WSAStartup(MAKEWORD(2, 2), &wsa_data);
        if (sock_start_result) {
            std::cerr << "WSAStartup failed with error: " <<  sock_start_result << "\n";
        } else {
            struct addrinfo hints;
            struct addrinfo *result = NULL;
            ZeroMemory(&hints, sizeof(hints));
            hints.ai_family = AF_INET;
            hints.ai_socktype = SOCK_STREAM;
            hints.ai_protocol = IPPROTO_TCP;
            hints.ai_flags = AI_PASSIVE;

            char port_str[10] = {0};
            sock_start_result = getaddrinfo(NULL, itoa(port, port_str, 10), &hints, &result);
            if (sock_start_result) {
                std::cerr << "TTS getaddrinfo failed with error: " <<  sock_start_result << "\n";
                WSACleanup();
            } else {
                _listen_sock = socket(result->ai_family, result->ai_socktype, result->ai_protocol);
                if (_listen_sock == INVALID_SOCKET) {
                    std::cerr << "TTS socket failed with error: " << WSAGetLastError << "\n";
                    freeaddrinfo(result);
                    WSACleanup();
                } else {
                    sock_start_result = bind(_listen_sock, result->ai_addr, (int)result->ai_addrlen);
                    if (sock_start_result == SOCKET_ERROR) {
                        std::cout << "TTS bind failed with error: " << WSAGetLastError() << "\n";
                        freeaddrinfo(result);
                        closesocket(_listen_sock);
                        WSACleanup();
                    } else {
                        freeaddrinfo(result);

                        sock_start_result = listen(_listen_sock, SOMAXCONN);
                        if (sock_start_result == SOCKET_ERROR) {
                            std::cerr << "TTS listen failed with error: %d\n" <<  WSAGetLastError() << "\n";
                            closesocket(_listen_sock);
                            WSACleanup();
                        } else {
                            _is_ready = true;
                        }
                    }
                }
            }
        }
    }

    ~Server() {
        closesocket(_listen_sock);
        int iresult = shutdown(_client_sock, SD_SEND);
        if (iresult == SOCKET_ERROR) {
            std::cerr << "TTS shutdown failed with error: " << WSAGetLastError() << "\n";
        }
        closesocket(_client_sock);
        WSACleanup();
    }

    bool is_ready() {
        return _is_ready;
    }

    void execute(StartVautodemo &tts_app) {
        _client_sock = accept(_listen_sock, NULL, NULL);
        if (_client_sock == INVALID_SOCKET) {
            std::cerr << "TTS accept failed with error: " << WSAGetLastError() << "\n";
            closesocket(_listen_sock);
            WSACleanup();
        } else {
            // Запуск приёма данных от клиента
            std::vector<char> buf;
            std::vector<char> rbuf(DEFAULT_BUFLEN);
            int iresult = 0;
            std::cout << "TTS wait input data...\n";
            do {
                iresult = recv(_client_sock, &rbuf[0], rbuf.size(), 0);
                if (iresult > 0) {
                    buf.insert(buf.end(), rbuf.begin(), rbuf.begin() + iresult);
                    if (buf.size() >= sizeof(uint16_t) and buf.size() == *(uint16_t*)&buf[0]) {
                        buf.erase(buf.begin(), buf.begin() + sizeof(uint16_t));
                        tts_app.textToAudio(std::string(buf.begin(), buf.end()));
                        buf.clear();
                    }
                } else if (not iresult) {
                    // Отключение клиента считается завершением работы
                    std::cout << "TTS Connection closing...\n";
                } else  {
                    std::cerr << "TTS recv failed with error: " <<  WSAGetLastError() << "\n";
                    closesocket(_client_sock);
                    WSACleanup();
                }
            } while (iresult > 0);
        }
    }
};
} // tools
} // arobot


static const char *VAUTODEMO_EXE_PATH = "~/.wine/drive_c/Program\\ Files\\ \\(x86\\)/Nuance/Vocalizer\\ for\\ Automotive\\ v5/" \
                                        "common/speech/components/vautodemo.exe";


int main(int argc, char **argv, char **env) {
    //if (argc not_eq 2) {
    //    std::cout << "Use: \"" << argv[0] << " <path to vautodemo.exe>\"\n";
    //    return EXIT_FAILURE;
    //}

    // Запуск враппеера
    arobot::tools::StartVautodemo wrapper(VAUTODEMO_EXE_PATH);
    if (wrapper.is_ready()) {
        std::cout << "TTS Wrapper is complete, attempt run server.\n";
        arobot::tools::Server server;
        if (server.is_ready()) {
            std::cout << "TTS Wrapper server is complete, recv commands.\n";
            server.execute(wrapper);
        } else {
            std::cerr << "TTS Wrapper is not complete.\n";
        }
    } else {
        std::cerr << "TTS Wrapper is not complete.\n";
    }
    return EXIT_SUCCESS;
}
