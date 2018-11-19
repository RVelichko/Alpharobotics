/** Copyright &copy; 2015, Alfarobotics.
 * \brief  Web Сервис подключения к wifi точке доступа.
 * \author Величко Ростислав
 * \date   26.04.2016
 */

// git clone git@github.com:google/gumbo-parser.git
// cd gumbo-parser/
// ./autogen.sh
// ./configure
// make

// Параметры фильтра wireshark: ip.addr == 10.0.31.10 and (http.request.method == "GET" or http.request.method == "POST")

// Пример запуска: ./ws-wifi-server

#include <stdio.h>

#include <iostream>
#include <iterator>
#include <set>
#include <map>
#include <vector>
#include <string>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <functional>
#include <ctime>

#include <boost/program_options.hpp>
#include <boost/regex.hpp>

#include <json/json.h>
#include <curl/curl.h>
#include <gumbo.h>

#include "Log.hpp"
#include "server_wss.hpp"

namespace arobot {
namespace tools {

typedef std::vector<std::string> WifiList;


static size_t recvFunc(char *data, size_t size, size_t nmemb, std::string *buf) {
    buf->append(data, size * nmemb);
    return size * nmemb;
}


class WifiController {
    struct WifiPoint {
        std::string _device;
        std::string _join;
        std::string _mode;
        std::string _bssid;
        std::string _channel;
        std::string _wep;
        std::string _wpa_version;
        std::string _wpa_suites;
        std::string _wpa_group;
        std::string _wpa_pairwise;
        std::string _clbridge;
    };

    std::pair<std::string, std::string> getLogin(const std::string &addr,
                                                 const std::string &login,
                                                 const std::string &password) {
        LOG(DEBUG) << addr << "; " << login << "; " << password;
        std::pair<std::string, std::string> result;
        CURL *curl = curl_easy_init();
        if (curl) {
            curl_easy_setopt(curl, CURLOPT_POST, 1);
            curl_easy_setopt(curl, CURLOPT_URL, ("http://" + addr + "/cgi-bin/luci/").c_str());
            curl_easy_setopt(curl, CURLOPT_USERAGENT, "curl/7.35.0");
            struct curl_slist *hlist = NULL;
            hlist = curl_slist_append(hlist, "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
            hlist = curl_slist_append(hlist, "Content-Type: application/x-www-form-urlencoded");
            hlist = curl_slist_append(hlist, "Connection: keep-alive");
            hlist = curl_slist_append(hlist, "Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4");
            hlist = curl_slist_append(hlist, "Accept-Encoding: gzip, deflate, sdch");
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, hlist);
            std::string postfields = "luci_username=" + login + "&luci_password=" + password;
            curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, postfields.size());
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS,  postfields.c_str());
            std::string header_buf;
            curl_easy_setopt(curl, CURLOPT_HEADERDATA, &header_buf);
            curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, recvFunc);

            CURLcode res = curl_easy_perform(curl);
            if (res not_eq CURLE_OK) {
                LOG(ERROR) << curl_easy_strerror(res);
            } else {
                boost::smatch what;
                boost::regex regex(R"([\s\w\d\S]*.(sysauth=)([\d\w]*)\;[\s\w\d\S]*.(stok=)([\d\w]*))");
                if (boost::regex_search(header_buf, what, regex)) {
                    result = std::make_pair(what[2].str(), what[4].str());
                    LOG(DEBUG) << "\nsysauth: " << what[2].str() << "\nstok: " << what[4].str();
                } else {
                    LOG(ERROR) << "Can`t find sysauth and stok";
                }
            }
            curl_easy_cleanup(curl);
        }
        return result;
    }

    std::string getWifiPage(const std::string &addr, const std::string &login, const std::string &password) {
        std::pair<std::string, std::string> sysauth_stok = getLogin(addr, login, password);
        std::string result;
        CURL *curl = curl_easy_init();
        if (curl) {
            std::string sysauth = sysauth_stok.first;
            std::string stok = sysauth_stok.second;
            std::string referer = "http://" + addr + "/cgi-bin/luci/;stok=" + stok;
            std::string rest = "/admin/network/wireless";
            LOG(DEBUG) << referer << rest;
            curl_easy_setopt(curl, CURLOPT_URL, (referer + rest).c_str());
            curl_easy_setopt(curl, CURLOPT_USERAGENT, "curl/7.35.0");
            struct curl_slist *hlist = NULL;
            hlist = curl_slist_append(hlist, ("Cookie: sysauth=" + sysauth).c_str());
            hlist = curl_slist_append(hlist, "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
            hlist = curl_slist_append(hlist, "Upgrade-Insecure-Requests: 1");
            hlist = curl_slist_append(hlist, "Save-Data: on");
            hlist = curl_slist_append(hlist, ("Referer: " + referer).c_str());
            hlist = curl_slist_append(hlist, ("Host: " + addr).c_str());
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, hlist);
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &result);
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, recvFunc);

            CURLcode res = curl_easy_perform(curl);
            if (res not_eq CURLE_OK) {
                LOG(ERROR) << curl_easy_strerror(res);
            }
            curl_easy_cleanup(curl);
        }
        return result;
    }

    std::string getJoin(const std::string &addr, const std::string &login, const std::string &password) {
        std::pair<std::string, std::string> sysauth_stok = getLogin(addr, login, password);
        std::string result;
        CURL *curl = curl_easy_init();
        if (curl) {
            std::string sysauth = sysauth_stok.first;
            std::string stok = sysauth_stok.second;
            std::string referer = "http://" + addr + "/cgi-bin/luci/;stok=" + stok + "/admin/network/wireless";
            std::string rest = referer + "_join/radio0.network1?device=radio0";
            LOG(DEBUG) << referer << rest;
            curl_easy_setopt(curl, CURLOPT_URL, rest.c_str());
            curl_easy_setopt(curl, CURLOPT_USERAGENT, "curl/7.35.0");
            struct curl_slist *hlist = NULL;
            hlist = curl_slist_append(hlist, "Upgrade-Insecure-Requests: 1");
            hlist = curl_slist_append(hlist, ("Cookie: sysauth=" + sysauth).c_str());
            hlist = curl_slist_append(hlist, "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
            hlist = curl_slist_append(hlist, "DNT: 1");
            hlist = curl_slist_append(hlist, "Save-Data: on");
            hlist = curl_slist_append(hlist, ("Referer: " + referer).c_str());
            hlist = curl_slist_append(hlist, ("Host: " + addr).c_str());
            hlist = curl_slist_append(hlist, "Accept-Encoding: gzip, deflate, sdch");
            hlist = curl_slist_append(hlist, "Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4");
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, hlist);
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &result);
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, recvFunc);

            CURLcode res = curl_easy_perform(curl);
            if (res not_eq CURLE_OK) {
                LOG(ERROR) << curl_easy_strerror(res);
            }
            curl_easy_cleanup(curl);
        }
        return result;
    }

    std::string getHtmlTable(GumboNode *node) {
        std::string result;
        if (node->type == GUMBO_NODE_ELEMENT) {
            if (node->v.element.tag == GUMBO_TAG_TR) {
                GumboVector *tr = &node->v.element.children;
                if (tr and 7 == tr->length) {
                    GumboVector *childs;
                    std::string quality = "0%";
                    GumboNode *td1 = static_cast<GumboNode*>(tr->data[1]);
                    if (td1 and td1->type == GUMBO_NODE_ELEMENT) {
                        childs = &td1->v.element.children;
                        GumboNode *abbr = static_cast<GumboNode*>(childs->data[1]);
                        if (abbr) {
                            childs = &abbr->v.element.children;
                            GumboNode *small = static_cast<GumboNode*>(childs->data[4]);
                            if (small) {
                                childs = &small->v.element.children;
                                GumboNode *ch = static_cast<GumboNode*>(childs->data[0]);
                                if (ch and ch->type == GUMBO_NODE_TEXT) {
                                    quality = ch->v.text.text;
                                }
                            }
                        }
                    }
                    std::string encryption = "WPA";
                    GumboNode *td3 = static_cast<GumboNode*>(tr->data[3]);
                    if (td3 and td3->type == GUMBO_NODE_ELEMENT) {
                        childs = &td3->v.element.children;
                        GumboNode *abbr = static_cast<GumboNode*>(childs->data[12]);
                        if (abbr) {
                            childs = &abbr->v.element.children;
                            GumboNode *ch = static_cast<GumboNode*>(childs->data[0]);
                            if (ch and ch->type == GUMBO_NODE_TEXT) {
                                encryption = ch->v.text.text;
                            }
                        }
                    }
                    GumboNode *td5 = static_cast<GumboNode*>(tr->data[5]);
                    if (td5 and td5->type == GUMBO_NODE_ELEMENT) {
                        childs = &td5->v.element.children;
                        GumboNode *form = static_cast<GumboNode*>(childs->data[1]);
                        if (form) {
                            childs = &form->v.element.children;
                            if (24 == childs->length) {
                                auto input_func = [](GumboNode *ch) {
                                    std::string val;
                                    if (ch and ch->type == GUMBO_NODE_ELEMENT and ch->v.element.tag == GUMBO_TAG_INPUT) {
                                        val = gumbo_get_attribute(&ch->v.element.attributes, "value")->value;
                                    }
                                    return val;
                                };
                                std::stringstream w;
                                w << "{\"device\":\"" << input_func(static_cast<GumboNode*>(childs->data[1])) << "\",";
                                w << "\"join\":\"" << input_func(static_cast<GumboNode*>(childs->data[3])) << "\",";
                                w << "\"mode\":\"" << input_func(static_cast<GumboNode*>(childs->data[5])) << "\",";
                                w << "\"bssid\":\"" << input_func(static_cast<GumboNode*>(childs->data[7])) << "\",";
                                w << "\"channel\":\"" << input_func(static_cast<GumboNode*>(childs->data[9])) << "\",";
                                w << "\"wep\":\"" << input_func(static_cast<GumboNode*>(childs->data[11])) << "\",";
                                w << "\"wpa_version\":\"" << input_func(static_cast<GumboNode*>(childs->data[13])) << "\",";
                                w << "\"wpa_suites\":\"" << input_func(static_cast<GumboNode*>(childs->data[15])) << "\",";
                                w << "\"wpa_group\":\"" << input_func(static_cast<GumboNode*>(childs->data[17])) << "\",";
                                w << "\"wpa_pairwise\":\"" << input_func(static_cast<GumboNode*>(childs->data[19])) << "\",";
                                w << "\"clbridge\":\"" << input_func(static_cast<GumboNode*>(childs->data[21])) << "\",";
                                w << "\"encryption\":\"" << encryption << "\",";
                                w << "\"quality\":\"" << quality << "\"}";
                                result = w.str();
                            }
                        }
                    }
                }
            }
            GumboVector *children = &node->v.element.children;
            for (unsigned int i = 0; i < children->length; ++i) {
                std::string r = getHtmlTable(static_cast<GumboNode*>(children->data[i]));
                if (not r.empty()) {
                    if (result.empty()) {
                        result = r;
                    } else {
                        result = r + "," + result;
                    }
                }
            }
        }
        return result;
    }

    std::pair<std::string, std::string> getReqParams(const Json::Value &params) {
        std::string res;
        auto set_value = [params](const std::string &name) {
            std::string r;
            if (params[name].isString()) {
                r += name + "=" + params[name].asString();
            } else if (params.isBool()) {
                r += name + "=" + std::to_string(params[name].asBool());
            } else if (params.isInt()) {
                r += name + "=" + std::to_string(params[name].asInt());
            } else if (params.isUInt()) {
                r += name + "=" + std::to_string(params[name].asUInt());
            } else if (params.isDouble()) {
                r += name + "=" + std::to_string(params[name].asDouble());
            }
            return r;
        };
        std::string device = set_value("device");
        res += device + "&";
        res += set_value("join") + "&";
        res += set_value("mode") + "&";
        res += set_value("bssid") + "&";
        res += set_value("channel") + "&";
        res += set_value("wep") + "&";
        res += set_value("wpa_version") + "&";
        res += set_value("wpa_suites") + "&";
        res += set_value("wpa_group") + "&";
        res += set_value("wpa_pairwise") + "&";
        res += set_value("clbridge");
        return std::make_pair(device, res);
    }

    std::string getJsonValue(const std::string &name, const Json::Value &value) {
        std::string r;
        if (not value[name].isNull()) {
            if (value[name].isString()) {
                LOG(DEBUG) << name << " : " << value[name].asString();
                r = value[name].asString();
            } else {
                LOG(DEBUG) << name << " : " << value[name].asDouble();
                r = std::to_string(value[name].asInt());
            }
        }
        return r;
    };

    /**
     *  Отправка сообщения на подготовку к подключению
     *
     * \param addr    Адрес сервера подключений
     * \param sysauth Ключь авторизации
     * \param stok    Идентификатор авторизации
     * \param wifi    Настройки текущего подключения
     */
    bool connectJoin(const std::string &addr, const std::string &sysauth, const std::string &stok, const Json::Value &wifi) {
        //device=radio0&join=ARnetWiFi5GHz&mode=Master&bssid=00%3A27%3A22%3A70%3AF6%3A2E&channel=36&wep=0&wpa_version=2&wpa_suites=PSK&wpa_group=CCMP&wpa_pairwise=CCMP&clbridge=0
        bool ret = false;
        CURL *curl = curl_easy_init();
        if (curl) {
            std::string rest = "http://" + addr + "/cgi-bin/luci/;stok=" + stok + "/admin/network/wireless_join";
            curl_easy_setopt(curl, CURLOPT_POST, 1);
            curl_easy_setopt(curl, CURLOPT_URL, rest.c_str());
            curl_easy_setopt(curl, CURLOPT_USERAGENT, "curl/7.35.0");
            struct curl_slist *hlist = NULL;
            hlist = curl_slist_append(hlist, "Upgrade-Insecure-Requests: 1");
            hlist = curl_slist_append(hlist, ("Cookie: sysauth=" + sysauth).c_str());
            hlist = curl_slist_append(hlist,
                                      "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
            hlist = curl_slist_append(hlist, "DNT: 1");
            hlist = curl_slist_append(hlist, "Save-Data: on");
            std::string device = getJsonValue("device", wifi);
            std::string referer = rest + "?device=" + device;
            LOG(DEBUG) << referer;
            hlist = curl_slist_append(hlist, ("Referer: " + referer).c_str());
            hlist = curl_slist_append(hlist, ("Host: " + addr).c_str());
            hlist = curl_slist_append(hlist, "Accept-Encoding: gzip, deflate, sdch");
            hlist = curl_slist_append(hlist, "Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4");
            hlist = curl_slist_append(hlist, "Connection: keep-alive");
            hlist = curl_slist_append(hlist, "Content-Type: application/x-www-form-urlencoded; charset=UTF-8");
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, hlist);
            std::stringstream postfields;
            postfields
                << "device=" << device
                << "&join=" << getJsonValue("join", wifi)
                << "&mode=" << getJsonValue("mode", wifi)
                << "&bssid=" << getJsonValue("bssid", wifi)
                << "&channel=" << getJsonValue("channel", wifi)
                << "&wep=" << getJsonValue("wep", wifi)
                << "&wpa_version=" << getJsonValue("wpa_version", wifi)
                << "&wpa_suites=" << getJsonValue("wpa_suites", wifi)
                << "&wpa_group=" << getJsonValue("wpa_group", wifi)
                << "&wpa_pairwise=" << getJsonValue("wpa_pairwise", wifi)
                << "&clbridge=" << getJsonValue("clbridge", wifi);
            std::string pf = postfields.str();
            curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, pf.size());
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS,  pf.c_str());
            std::string result;
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &result);
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, recvFunc);

            CURLcode res = curl_easy_perform(curl);
            if (res not_eq CURLE_OK) {
                LOG(ERROR) << curl_easy_strerror(res);
                ret = false;
            } else {
                LOG(ERROR) << "result: " << result;
                ret = true;
            }
            curl_easy_cleanup(curl);
        }
        return ret;
    }

    /**
     *  Отправка сообщения на сохранение параметров нового подключения
     *
     * \param addr    Адрес сервера подключений
     * \param sysauth Ключь авторизации
     * \param stok    Идентификатор авторизации
     * \param wifi    Настройки текущего подключения
     */
    bool connectSave(const std::string &addr, const std::string &sysauth, const std::string &stok, const Json::Value &wifi) {
        bool ret = false;
        if (not wifi["WPA"].isNull() and not wifi["ESSID"].isNull()) {
            CURL *curl = curl_easy_init();
            if (curl) {
                LOG(DEBUG) << addr << ", " << sysauth << ", " <<  stok;
                std::string rest = "http://" + addr + "/cgi-bin/luci/;stok=" + stok + "/admin/network/wireless_join";
                std::string referer = rest;
                LOG(DEBUG) << rest;
                curl_easy_setopt(curl, CURLOPT_URL, rest.c_str());
                curl_easy_setopt(curl, CURLOPT_USERAGENT, "curl/7.35.0");
                // Формирование заголовка
                struct curl_slist *hlist = NULL;
                hlist = curl_slist_append(hlist, ("Host: " + addr).c_str());
                hlist = curl_slist_append(hlist, "Upgrade-Insecure-Requests: 1");
                hlist = curl_slist_append(hlist, ("Cookie: sysauth=" + sysauth).c_str());
                hlist = curl_slist_append(hlist,
                                          "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
                hlist = curl_slist_append(hlist, "DNT: 1");
                hlist = curl_slist_append(hlist, "Save-Data: on");
                hlist = curl_slist_append(hlist, ("Referer: " + referer).c_str());
                hlist = curl_slist_append(hlist, "Accept-Encoding: gzip, deflate, sdch");
                hlist = curl_slist_append(hlist, "Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4");
                hlist = curl_slist_append(hlist, "Connection: keep-alive");
                hlist = curl_slist_append(hlist, "Content-Type: multipart/form-data; charset=UTF-8");
                curl_easy_setopt(curl, CURLOPT_HTTPHEADER, hlist);
                // Формирование многоуровнего блока данных POST зароса
                struct curl_httppost* formpost = NULL;
                struct curl_httppost* lastptr = NULL;
                curl_formadd(&formpost, &lastptr, CURLFORM_COPYNAME, "cbi.submit",
                             CURLFORM_PTRCONTENTS, "1",
                             CURLFORM_END);
                curl_formadd(&formpost, &lastptr, CURLFORM_COPYNAME, "cbi.cbe.network.1.replace",
                             CURLFORM_PTRCONTENTS, "1",
                             CURLFORM_END);
                curl_formadd(&formpost, &lastptr, CURLFORM_COPYNAME, "cbid.network.1.replace",
                             CURLFORM_PTRCONTENTS, "1",
                             CURLFORM_END);
                std::string wifi_key = getJsonValue("WPA", wifi);
                char wpa_buf[128] = {0};
                strncpy(wpa_buf, wifi_key.c_str(), wifi_key.size());
                curl_formadd(&formpost, &lastptr,
                             CURLFORM_COPYNAME, "cbid.network.1.key", CURLFORM_PTRCONTENTS, wpa_buf, CURLFORM_END);
                std::string wifi_login = getJsonValue("ESSID", wifi);
                char essid_buf[128] = {0};
                strncpy(essid_buf, wifi_login.c_str(), wifi_login.size());
                curl_formadd(&formpost, &lastptr,
                             CURLFORM_COPYNAME, "cbid.network.1._netname_new", CURLFORM_PTRCONTENTS, essid_buf, CURLFORM_END);
                curl_formadd(&formpost, &lastptr,
                             CURLFORM_COPYNAME, "cbid.network.1._fwzone", CURLFORM_PTRCONTENTS, "wan", CURLFORM_END);
                curl_formadd(&formpost, &lastptr,
                             CURLFORM_COPYNAME, "cbid.network.1._fwzone.newzone", CURLFORM_PTRCONTENTS, "", CURLFORM_END);
                Json::Value wifi_settings = wifi["settings"];
                auto set_value = [this,formpost,lastptr](const std::string &name, const Json::Value &value) {
                    std::string val = getJsonValue(name, value);
                    struct curl_httppost** f = (struct curl_httppost**)&formpost;
                    struct curl_httppost** l = (struct curl_httppost**)&lastptr;
                    char buf[128] = {0};
                    strncpy(buf, val.c_str(), val.size());
                    curl_formadd(f, l, CURLFORM_COPYNAME, name.c_str(), CURLFORM_PTRCONTENTS, buf, CURLFORM_END);
                };
                set_value("channel", wifi_settings);
                set_value("wep", wifi_settings);
                set_value("wpa_suites", wifi_settings);
                set_value("wpa_version", wifi_settings);
                set_value("join", wifi_settings);
                set_value("device", wifi_settings);
                set_value("mode", wifi_settings);
                set_value("bssid", wifi_settings);
                curl_easy_setopt(curl, CURLOPT_HTTPPOST, formpost);
                // Обработка результата.
                std::string result;
                curl_easy_setopt(curl, CURLOPT_WRITEDATA, &result);
                curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, recvFunc);

                CURLcode res = curl_easy_perform(curl);
                if (res not_eq CURLE_OK) {
                    LOG(ERROR) << curl_easy_strerror(res);
                    ret = false;
                } else {
                    LOG(ERROR) << "result: " << result;
                    ret = true;
                }
                curl_easy_cleanup(curl);
            }
        }
        return ret;
    }

public:
    WifiController() {
        //std::ifstream ifs("/home/rostislav/Develop/alfarobotics/data/wifi_test.html");
        //std::string str = std::string(std::istreambuf_iterator<char>(ifs), std::istreambuf_iterator<char>());
        //GumboOutput *output = gumbo_parse(str.c_str());
        //LOG(DEBUG) << getHtmlTable(output->root);
        //gumbo_destroy_output(&kGumboDefaultOptions, output);

        //LOG(DEBUG) << "list: \"" << getList("10.0.27.55", "root", "ARnet9308") << "\"";

        //std::string wifi_json =
        //    "{\"WPA\":\"89269792539\"," \
        //    "\"ESSID\":\"wwan\"," \
        //    "\"settings\":{" \
        //        "\"device\":\"radio0\"," \
        //        "\"join\":\"ARnetWiFi5GHz\"," \
        //        "\"mode\":\"Master\"," \
        //        "\"bssid\":\"00:27:22:70:F6:2E\"," \
        //        "\"channel\":36," \
        //        "\"wep\":0," \
        //        "\"wpa_version\":2," \
        //        "\"wpa_suites\":\"PSK\"," \
        //        "\"wpa_group\":\"CCMP\"," \
        //        "\"wpa_pairwise\":\"CCMP\"," \
        //        "\"clbridge\":0," \
        //        "\"encryption\":\"WPA2 - PSK\"," \
        //        "\"quality\":\"88%\"}}";
        //Json::Value wifi;
        //Json::Reader reader;
        //if (reader.parse(wifi_json, wifi)) {
        //    LOG(DEBUG) << wifi_json;
        //    connect("10.0.31.10", "root", "ARnet9308", wifi);
        //}
    }

    /**
     *  Получение списка подключенных сетей
     *  пример запроса: {"cmd":"status"}, ответ: {"status":{...}}
     *
     * \param addr     Адрес роутера
     * \param login    Логин для доступа к роутеру
     * \param password Пароль для доступа к роутеру
     */
    std::string getStatus(const std::string &addr, const std::string &login, const std::string &password) {
        std::string result;
        std::pair<std::string, std::string> sysauth_stok = getLogin(addr, login, password);
        if (not sysauth_stok.first.empty() and not sysauth_stok.second.empty()) {
            std::string sysauth = sysauth_stok.first;
            std::string stok = sysauth_stok.second;
            CURL *curl = curl_easy_init();
            if (curl) {
                double encode = (double)std::rand() / (double)RAND_MAX;
                std::string referer = "http://" + addr + "/cgi-bin/luci/;stok=" + stok + "/admin/network/wireless";
                std::string rest = referer + "_status/radio0.network1?_=" + std::to_string(encode);
                LOG(DEBUG) << referer << rest;
                curl_easy_setopt(curl, CURLOPT_URL, rest.c_str());
                curl_easy_setopt(curl, CURLOPT_USERAGENT, "curl/7.35.0");
                struct curl_slist *hlist = NULL;
                hlist = curl_slist_append(hlist, ("Cookie: sysauth=" + sysauth).c_str());
                hlist = curl_slist_append(hlist, "Accept: */*");
                hlist = curl_slist_append(hlist, "DNT: 1");
                hlist = curl_slist_append(hlist, "Save-Data: on");
                hlist = curl_slist_append(hlist, ("Referer: " + referer).c_str());
                hlist = curl_slist_append(hlist, ("Host: " + addr).c_str());
                hlist = curl_slist_append(hlist, "Accept-Encoding: gzip, deflate, sdch");
                hlist = curl_slist_append(hlist, "Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4");
                curl_easy_setopt(curl, CURLOPT_HTTPHEADER, hlist);
                curl_easy_setopt(curl, CURLOPT_WRITEDATA, &result);
                curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, recvFunc);

                CURLcode res = curl_easy_perform(curl);
                if (res not_eq CURLE_OK) {
                    LOG(ERROR) << curl_easy_strerror(res);
                }
                curl_easy_cleanup(curl);
            }
        }
        return result;
    }

    /**
     *  Получение списка доступных сетей для подключения
     *  пример запроса: {"cmd":"list"}, ответ: {"list":[...]}
     *
     * \param addr     Адрес роутера
     * \param login    Логин для доступа к роутеру
     * \param password Пароль для доступа к роутеру
     */
    std::string getList(const std::string &addr, const std::string &login, const std::string &password) {
        std::string join_page = getJoin(addr, login, password);
        GumboOutput *output = gumbo_parse(join_page.c_str());
        std::stringstream list;
        list << "["  << getHtmlTable(output->root) << "]";
        gumbo_destroy_output(&kGumboDefaultOptions, output);
        LOG(DEBUG) << list.str();
        return list.str();
    }

    /**
     *  Отправка сообщения на отключение текущего подключения
     *  пример запроса: {"cmd":"connect", "wifi":{...}}, ответ: {"connect":"ok"}
     *
     * \param addr     Адрес роутера
     * \param login    Логин для доступа к роутеру
     * \param password Пароль для доступа к роутеру
     */
    bool connect(const std::string &addr, const std::string &login, const std::string &password, const Json::Value &wifi) {
        bool ret = false;
        if (not wifi["settings"].isNull()) {
            Json::Value wifi_settings = wifi["settings"];
            std::pair<std::string, std::string> sysauth_stok = getLogin(addr, login, password);
            if (connectJoin(addr, sysauth_stok.first, sysauth_stok.second, wifi_settings)) {
                ret = connectSave(addr, sysauth_stok.first, sysauth_stok.second, wifi);
            }
        }
        return ret;
    }

    /**
     *  Отправка сообщения на отключение текущего подключения
     *  пример запроса: {"cmd":"disconnect", "wifi":{...}}, ответ: {"disconnect":"ok"}
     *
     * \param addr     Адрес роутера
     * \param login    Логин для доступа к роутеру
     * \param password Пароль для доступа к роутеру
     */
    bool disconnect(const std::string &addr, const std::string &login, const std::string &password, const Json::Value &wifi) {
        std::pair<std::string, std::string> sysauth_stok = getLogin(addr, login, password);
        bool ret = true;
        CURL *curl = curl_easy_init();
        if (curl) {
            std::string sysauth = sysauth_stok.first;
            std::string stok = sysauth_stok.second;
            double encode = (double)std::rand() / (double)RAND_MAX;
            std::string referer = "http://" + addr + "/cgi-bin/luci/;stok=" + stok + "/admin/network/wireless";
            std::string rest = referer + "_shutdown/radio0.network1?" + std::to_string(encode);
            LOG(DEBUG) << referer << rest;
            curl_easy_setopt(curl, CURLOPT_POST, 1);
            curl_easy_setopt(curl, CURLOPT_URL, rest.c_str());
            curl_easy_setopt(curl, CURLOPT_USERAGENT, "curl/7.35.0");
            struct curl_slist *hlist = NULL;
            hlist = curl_slist_append(hlist, "Upgrade-Insecure-Requests: 1");
            hlist = curl_slist_append(hlist, ("Cookie: sysauth=" + sysauth).c_str());
            hlist = curl_slist_append(hlist,
                                      "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
            hlist = curl_slist_append(hlist, "DNT: 1");
            hlist = curl_slist_append(hlist, "Save-Data: on");
            hlist = curl_slist_append(hlist, ("Referer: " + referer + "?").c_str());
            hlist = curl_slist_append(hlist, ("Host: " + addr).c_str());
            hlist = curl_slist_append(hlist, "Accept-Encoding: gzip, deflate, sdch");
            hlist = curl_slist_append(hlist, "Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4");
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, hlist);
            std::string result;
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &result);
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, recvFunc);

            CURLcode res = curl_easy_perform(curl);
            if (res not_eq CURLE_OK) {
                LOG(ERROR) << curl_easy_strerror(res);
                ret = false;
            } else {
                LOG(ERROR) << result;
            }
            curl_easy_cleanup(curl);
        }
        return ret;
    }

    /**
     *  Отправка сообщения на удаление текущего подключения
     *  пример запроса: {"cmd":"remove"}, ответ: {"remove":"ok"}
     *
     * \param addr     Адрес роутера
     * \param login    Логин для доступа к роутеру
     * \param password Пароль для доступа к роутеру
     */
    bool remove(const std::string &addr, const std::string &login, const std::string &password) {
        std::pair<std::string, std::string> sysauth_stok = getLogin(addr, login, password);
        bool ret = true;
        CURL *curl = curl_easy_init();
        if (curl) {
            std::string sysauth = sysauth_stok.first;
            std::string stok = sysauth_stok.second;
            std::string referer = "http://" + addr + "/cgi-bin/luci/;stok=" + stok + "/admin/network/wireless";
            std::string rest = referer + "_delete/wlan0";
            LOG(DEBUG) << referer << rest;
            curl_easy_setopt(curl, CURLOPT_POST, 1);
            curl_easy_setopt(curl, CURLOPT_URL, rest.c_str());
            curl_easy_setopt(curl, CURLOPT_USERAGENT, "curl/7.35.0");
            struct curl_slist *hlist = NULL;
            hlist = curl_slist_append(hlist, "Upgrade-Insecure-Requests: 1");
            hlist = curl_slist_append(hlist, ("Cookie: sysauth=" + sysauth).c_str());
            hlist = curl_slist_append(hlist,
                                      "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8");
            hlist = curl_slist_append(hlist, "DNT: 1");
            hlist = curl_slist_append(hlist, "Save-Data: on");
            hlist = curl_slist_append(hlist, ("Referer: " + referer + "?").c_str());
            hlist = curl_slist_append(hlist, ("Host: " + addr).c_str());
            hlist = curl_slist_append(hlist, "Accept-Encoding: gzip, deflate, sdch");
            hlist = curl_slist_append(hlist, "Accept-Language: ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4");
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, hlist);
            std::string result;
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &result);
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, recvFunc);

            CURLcode res = curl_easy_perform(curl);
            if (res not_eq CURLE_OK) {
                LOG(ERROR) << curl_easy_strerror(res);
                ret = false;
            } else {
                LOG(ERROR) << result;
            }
            curl_easy_cleanup(curl);
        }
        return ret;
    }
};


typedef SimpleWeb::SocketServer<SimpleWeb::WSS> WssServer;
typedef WssServer::Endpoint Endpoint;
typedef WssServer::Connection Connection;
typedef WssServer::Message Message;
typedef WssServer::SendStream SendStream;


class WifiServer
    : public WssServer {
    typedef std::shared_ptr<Connection> PConnection;
    typedef std::shared_ptr<Message> PMessage;
    typedef std::shared_ptr<WifiController> PWifiController;

    Endpoint &_wifi_endpoint;
    PWifiController _wifi_controller;
    std::string _wifi_addr;
    std::string _login;
    std::string _password;

    std::mutex _mutex;

    /**
     *  Отправка сообщения по идентификатору подключения с обработкой ошибок
     *
     * \param connection  Подключение
     * \param json_msg    Строка, содержащая сообщение в json формате
     */
    void sendMessage(PConnection connection, const std::string &json_msg) {
        auto send_stream = std::make_shared<SendStream>();
        *send_stream << json_msg;
        this->send(connection, send_stream, [](const boost::system::error_code &ec) {
            if (ec) {
                LOG(ERROR) << ec << ", message: \"" << ec.message() << "\"";
            }
        });
        LOG(DEBUG) << json_msg;
    }

    /**
     *  Отправка описания ошибки по идентификатору подключения с обработкой ошибок в виде json
     *
     * \param connection Подключение
     * \param error      Строка, содержащая сообщение об ошибке
     */
    void sendError(PConnection connection, const std::string &error) {
        std::stringstream ss;
        ss << "{\"error\":\"" << error << "\"}";
        LOG(ERROR) << ss.str();
        sendMessage(connection, ss.str());
    }

    void wifiEndpoint() {
        // Приём сообщений на обработку подключений в виде json
        _wifi_endpoint.onmessage = [this](PConnection connection, PMessage message) {
            if (message->fin_rsv_opcode not_eq 136) {
            }
            std::string msg = message->string();
            LOG(DEBUG) << "msg < \"" << msg << "\"";
            try {
                Json::Value json;
                Json::Reader reader;
                if (reader.parse(msg, json)) {
                    // Обработка команды
                    if (not json["cmd"].isNull()) {
                        typedef std::function<std::string(const std::string&,
                                                          const std::string&,
                                                          const std::string&)> GetFunc;
                        auto get = [this](PConnection connection,
                                          const Json::Value &json,
                                          const std::string &type,
                                          const GetFunc &get_func) {
                            if (json["cmd"].asString() == type) {
                                std::stringstream ss;
                                ss << "{\""<< type << "\":";
                                {
                                    std::lock_guard<std::mutex> lock(_mutex);
                                    std::string val = get_func(_wifi_addr, _login, _password);
                                    if (not val.empty()) {
                                        ss << val;
                                    } else {
                                        ss << "{}";
                                    }
                                }
                                ss << "}";
                                sendMessage(connection, ss.str());
                            }
                        };
                        namespace p = std::placeholders;
                        // Запрос получения информации о статусе подключенияй
                        get(connection, json, "status",
                            std::bind(&WifiController::getStatus, _wifi_controller.get(), p::_1, p::_2, p::_3));
                        // Запрос получения информации о имеющихся источниках
                        get(connection, json, "list",
                            std::bind(&WifiController::getList, _wifi_controller.get(), p::_1, p::_2, p::_3));

                        typedef std::function<bool(const std::string&,
                                                   const std::string&,
                                                   const std::string&,
                                                   const Json::Value&)> CmdFunc;
                        auto on_off_connect = [this](PConnection connection,
                                                     const Json::Value &json,
                                                     const std::string &type,
                                                     const CmdFunc &cmd_func) {
                            if (json["cmd"].asString() == type) {
                                if (not json["wifi"].isNull()) {
                                    Json::Value wifi_json = json["wifi"];
                                    bool cmd_res;
                                    {
                                        std::lock_guard<std::mutex> lock(_mutex);
                                        cmd_res = cmd_func(_wifi_addr, _login, _password, wifi_json);
                                    }
                                    if (cmd_res) {
                                        std::stringstream ss;
                                        ss << "{\"" << type << "\":\"ok\"}";
                                        sendMessage(connection, ss.str());
                                    } else {
                                        Json::FastWriter fastWriter;
                                        sendError(connection,"Can`t connect to");
                                    }
                                } else {
                                    LOG(ERROR) << "\"wifi\" is not found.";
                                    sendError(connection, "\"wifi\" is not found.");
                                }
                            }
                        };
                        // Запрос на подключение к точке доступа
                        on_off_connect(connection, json, "connect",
                                       std::bind(&WifiController::connect, _wifi_controller.get(), p::_1, p::_2, p::_3, p::_4));
                        // Запрос на отключение от точки доступа
                        on_off_connect(connection, json, "disconnect",
                                       std::bind(&WifiController::disconnect, _wifi_controller.get(), p::_1, p::_2, p::_3, p::_4));
                        // Запрос на уждаление точки доступа из спика
                        if (json["cmd"].asString() == "remove") {
                            bool cmd_res;
                            {
                                std::lock_guard<std::mutex> lock(_mutex);
                                cmd_res = _wifi_controller->remove(_wifi_addr, _login, _password);
                            }
                            if (cmd_res) {
                                std::stringstream ss;
                                ss << "{\"remove\":\"ok\"}";
                                sendMessage(connection, ss.str());
                            } else {
                                Json::FastWriter fastWriter;
                                sendError(connection,"Can`t connect to");
                            }
                        }
                    }
                } else {
                    sendError(connection, "Can`t parse input json message '" + msg + "'");
                }
            } catch (const std::exception &e) {
                sendError(connection, "Can`t parse input json message '" + msg + "'; " + e.what());
            }
        };

        _wifi_endpoint.onopen = [this](PConnection connection) {
            size_t id = (size_t)connection.get();
            LOG(INFO) << "Opened connection: " << id;
        };

        _wifi_endpoint.onclose = [this](PConnection connection, int status, const std::string &reason) {
            size_t id = (size_t)connection.get();
            LOG(INFO) << "Closed connection: " << id << " with status code " << status << " \"" << reason << "\"";
        };

        _wifi_endpoint.onerror = [this](PConnection connection, const boost::system::error_code &ec) {
            size_t id = (size_t)connection.get();
            LOG(ERROR) << "Connection: " << id << ", " << ec << ", \"" << ec.message() << "\"";
        };
    }

public:
    /**
     *  Конструктор wifi сервиса
     *
     * \param port     Порт подключения
     * \param endpoint Rest идентификатор доступа к сервису
     * \param login    Логин сервера маршрутизатора
     * \param password Пароль сервера маршрутизатора
     * \param srvcrt   ssh сертификат
     * \param srvkey   ssh ключ
     */
    WifiServer(unsigned short port, const std::string &endpoint,
               const std::string &wifi_addr, const std::string &login, const std::string &password,
               const std::string &srvcrt, const std::string &srvkey)
        : WssServer(port, std::thread::hardware_concurrency() + 1, srvcrt, srvkey)
        , _wifi_endpoint(WssServer::endpoint["^/" + endpoint + "/?$"])
        , _wifi_controller(std::make_shared<WifiController>())
        , _wifi_addr(wifi_addr)
        , _login(login)
        , _password(password) {
        std::srand(unsigned(std::time(0)));
        LOG(INFO) << "Start: " << srvcrt << ", " << srvkey << ", " << port << ", " << endpoint << ", "
                  << wifi_addr << ", " << login << ", " << password;
        wifiEndpoint();
        std::thread thread([this](){
            this->start();
        });
        thread.join();
    }
};
} // tools
} // arobot


#define DEFAULT_PORT 20002

namespace bpo = boost::program_options;

int main(int argc, char **argv) {
    LOG_TO_STDOUT;
    try {
        int port;
        std::string rest;
        std::string wifi_addr;
        std::string login;
        std::string password;
        std::string srvcrt;
        std::string srvkey;
        bpo::options_description desc("Сервер организации подключения к wifi токе доступа");
        desc.add_options()
          ("help,h", "Показать список параметров")
          ("port,p", bpo::value<int>(&port)->default_value(DEFAULT_PORT), "Порт для подключения к wifi серверу")
          ("endpoint,e", bpo::value<std::string>(&rest)->default_value("rest/wifi"), "Рест адрес подключения к сервису")
          ("wifi_addr,w", bpo::value<std::string>(&wifi_addr)->default_value("10.0.31.20"), "Адрес сервера Bullet")
          ("login,l", bpo::value<std::string>(&login)->default_value("root"), "Логин к Bullet")
          ("password,r", bpo::value<std::string>(&password)->default_value("ARnet9308"), "Пароль к Bullet")
          ("srvcrt,c", bpo::value<std::string>(&srvcrt)->default_value("/etc/nginx/ssl/alfasert.crt"), "SSL сертификат")
          ("srvkey,k", bpo::value<std::string>(&srvkey)->default_value("/etc/nginx/ssl/alfasert.key"), "SSL ключ")
          ; //NOLINT
        bpo::variables_map vm;
        bpo::store(bpo::parse_command_line(argc, argv, desc), vm);
        bpo::notify(vm);

        if (vm.count("help")) {
            std::cout << desc << "\n";
            return 0;
        }
        arobot::tools::WifiServer wifi(port, rest, wifi_addr, login, password, srvcrt, srvkey);
        //arobot::tools::WifiController wc;
    } catch (std::exception &e) {
        LOG(ERROR) << e.what() << "\n";
    }
    return 0;
}


// /cgi-bin/luci/;stok=3645ffae8dd695e6d655732c8534cd3d/admin/network/wireless_delete/wlan0'
// /cgi-bin/luci/;stok=3645ffae8dd695e6d655732c8534cd3d/admin/network/wireless_shutdown/radio0.network1'
// /cgi-bin/luci/;stok=a3c48290fdfa96376f01bb29ba812ddd/admin/network/wireless_join/radio0.network1?device=radio1


//[{
//  "ifname":"wlan0",
//  "disabled":false,
//  "encryption":"WPA2 PSK (CCMP)",
//  "bssid":"00:27:22:70:F6:2E",
//  "mode":"Master",
//  "quality":0,
//  "noise":-95,
//  "ssid":"ARnetWiFi5GHz",
//  "link":"/cgi-bin/luci/;stok=cbd05efde180ab5eab8d4ebef147217e/admin/network/wireless/radio0.network1",
//  "id":"radio0.network1",
//  "txpoweroff":0,
//  "device":{
//      "device":"radio0",
//      "name":"Generic 802.11an Wireless Controller (radio0)",
//      "up":true
//  },
//  "country":"US",
//  "txpower":19,
//  "name":"Master \u0022ARnetWiFi5GHz\u0022",
//  "channel":36,
//  "assoclist":{},
//  "signal":0,
//  "up":true,
//  "frequency":"5.180"
//}]


//[{
//  "ifname":"wlan0",
//  "disabled":false,
//  "encryption":"WPA2 PSK (CCMP)",
//  "bssid":"00:27:22:70:F6:2E",
//  "mode":"Master",
//  "quality":84,
//  "noise":-95,
//  "ssid":"ARnetWiFi5GHz",
//  "link":"/cgi-bin/luci/;stok=bd3718c383a36d55b9207220f18f3a5a/admin/network/wireless/radio0.network1",
//  "id":"radio0.network1",
//  "txpoweroff":0,
//  "device":{
//      "device":"radio0",
//      "name":"Generic 802.11an Wireless Controller (radio0)",
//      "up":true
//  },
//  "country":"US",
//  "bitrate":60.1,
//  "txpower":19,
//  "name":"Master \u0022ARnetWiFi5GHz\u0022",
//  "channel":36,
//  "assoclist":{
//      "00:21:5C:7D:C5:49":{
//          "rx_short_gi":false,
//          "noise":-95,
//          "rx_mcs":0,
//          "tx_40mhz":false,
//          "rx_40mhz":false,
//          "tx_rate":58500,
//          "tx_packets":706,
//          "tx_short_gi":false,
//          "rx_packets":1049,
//          "tx_mcs":6,
//          "inactive":70,
//          "rx_rate":12000,
//          "signal":-56
//      },
//      "00:27:22:70:F6:A2":{
//          "rx_short_gi":false,
//          "noise":-95,
//          "rx_mcs":6,
//          "tx_40mhz":false,
//          "rx_40mhz":false,
//          "tx_rate":65000,
//          "tx_packets":4983,
//          "tx_short_gi":false,
//          "rx_packets":4656,
//          "tx_mcs":7,
//          "inactive":200,
//          "rx_rate":58500,
//          "signal":-45
//      },
//      "C4:85:08:AA:36:92":{
//          "rx_short_gi":false,
//          "noise":-95,
//          "rx_mcs":0,
//          "tx_40mhz":false,
//          "rx_40mhz":false,
//          "tx_rate":58500,
//          "tx_packets":4949,
//          "tx_short_gi":false,
//          "rx_packets":7256,
//          "tx_mcs":6,
//          "inactive":20,
//          "rx_rate":6000,
//          "signal":-52
//      }
//  },
//  "signal":-51,
//  "up":true,
//  "frequency":"5.180"
//}]



//------WebKitFormBoundary1vA25HfluK0mTAFa
//Content-Disposition: form-data; name="cbi.submit"
//
//1
//------WebKitFormBoundary1vA25HfluK0mTAFa
//Content-Disposition: form-data; name="cbi.cbe.network.1.replace"
//
//1
//------WebKitFormBoundary1vA25HfluK0mTAFa
//Content-Disposition: form-data; name="cbid.network.1.replace"
//
//1
//------WebKitFormBoundary1vA25HfluK0mTAFa
//Content-Disposition: form-data; name="cbid.network.1.key"
//
//89269792539
//------WebKitFormBoundary1vA25HfluK0mTAFa
//Content-Disposition: form-data; name="cbid.network.1._netname_new"
//
//wwan
//------WebKitFormBoundary1vA25HfluK0mTAFa
//Content-Disposition: form-data; name="cbid.network.1._fwzone"
//
//wan
//------WebKitFormBoundary1vA25HfluK0mTAFa
//Content-Disposition: form-data; name="cbid.network.1._fwzone.newzone"
//
//
//------WebKitFormBoundary1vA25HfluK0mTAFa
//Content-Disposition: form-data; name="channel"
//
//36
//------WebKitFormBoundary1vA25HfluK0mTAFa
//Content-Disposition: form-data; name="wpa_suites"
//
//PSK
//------WebKitFormBoundary1vA25HfluK0mTAFa
//Content-Disposition: form-data; name="wep"
//
//0
//------WebKitFormBoundary1vA25HfluK0mTAFa
//Content-Disposition: form-data; name="join"
//
//ARnetWiFi5GHz
//------WebKitFormBoundary1vA25HfluK0mTAFa
//Content-Disposition: form-data; name="device"
//
//radio0
//------WebKitFormBoundary1vA25HfluK0mTAFa
//Content-Disposition: form-data; name="mode"
//
//Master
//------WebKitFormBoundary1vA25HfluK0mTAFa
//Content-Disposition: form-data; name="bssid"
//
//00:27:22:70:F6:2E
//------WebKitFormBoundary1vA25HfluK0mTAFa
//Content-Disposition: form-data; name="wpa_version"
//
//2
//------WebKitFormBoundary1vA25HfluK0mTAFa--
