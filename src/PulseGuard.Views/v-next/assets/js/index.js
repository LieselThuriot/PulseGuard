"use strict";

/**
 * @typedef {Object} PulseItem
 * @property {string} state
 * @property {string} message
 * @property {string} from
 * @property {string} to
 */

/**
 * @typedef {Object} PulseGroupItem
 * @property {string} id
 * @property {string} name
 * @property {PulseItem[]} items
 */

/**
 * @typedef {Object} PulseGroup
 * @property {string} group
 * @property {PulseGroupItem[]} items
 */

(function () {
    // fetch('https://app.sdworx.com/pulseguard/api/1.0/pulses')
    //     .then(response => {
    //         if (!response.ok) {
    //             throw new Error('Network response was not ok ' + response.statusText);
    //         }
    //         /** @type {PulseGroup[]} */
    //         const data = response.json();
    //         return data;
    //     })
    //     .then(data => {
    //         handleData(data);
    //     })
    //     .catch(error => {
    //         console.error('There has been a problem with your fetch operation:', error);
    //     });



    /** @type {PulseGroup[]} */
    const data = [
        {
            "group": "Digital Channels",
            "items": [
                {
                    "id": "3CG71Cww3fyC",
                    "name": "CIA",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-06T14:01:00.8850122+00:00",
                            "to": "2025-03-11T12:07:00.9218544+00:00"
                        }
                    ]
                },
                {
                    "id": "81eIUi5wuusa",
                    "name": "App Gateway",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-02-04T11:22:00.3898674+00:00",
                            "to": "2025-03-11T12:07:00.9415967+00:00"
                        }
                    ]
                },
                {
                    "id": "RVQX3b79kF35",
                    "name": "mysdworx",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-09T21:34:00.5220635+00:00",
                            "to": "2025-03-11T12:07:00.8541537+00:00"
                        }
                    ]
                },
                {
                    "id": "gnJ438fxrXt",
                    "name": "Sanity Checks",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-07T11:28:00.4947035+00:00",
                            "to": "2025-03-11T12:07:00.8731236+00:00"
                        }
                    ]
                },
                {
                    "id": "tFkA3KrpX8c9",
                    "name": "Functionalities API",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T06:46:01.9643445+00:00",
                            "to": "2025-03-11T12:07:01.0479849+00:00"
                        },
                        {
                            "state": "Unhealthy",
                            "message": "Pulse check failed due to deserialization error",
                            "from": "2025-03-11T06:45:00.4798958+00:00",
                            "to": "2025-03-11T06:46:01.9039551+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-02-28T14:59:00.9752857+00:00",
                            "to": "2025-03-11T06:45:00.4287891+00:00"
                        }
                    ]
                },
                {
                    "id": "uCpFOyEdQfQ",
                    "name": "Channels API",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-02-14T04:01:00.8424255+00:00",
                            "to": "2025-03-11T12:07:00.9155935+00:00"
                        }
                    ]
                }
            ]
        },
        {
            "group": "TrustBuilder",
            "items": [
                {
                    "id": "4ok4CgSSY9B6",
                    "name": "TB.io",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-02-24T19:29:00.2266076+00:00",
                            "to": "2025-03-11T12:07:00.4453778+00:00"
                        }
                    ]
                },
                {
                    "id": "Dha3FoxI3E6a",
                    "name": "TB9 .well-known",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-09T10:51:00.1752985+00:00",
                            "to": "2025-03-11T12:07:00.4268561+00:00"
                        }
                    ]
                },
                {
                    "id": "NRbphSDPxKdB",
                    "name": ".well-known",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-02-24T07:58:05.6074393+00:00",
                            "to": "2025-03-11T12:07:00.4861114+00:00"
                        }
                    ]
                },
                {
                    "id": "bifi5A89QyKS",
                    "name": "wf_healthcheck",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-02-24T07:58:01.1492199+00:00",
                            "to": "2025-03-11T12:07:00.4253784+00:00"
                        }
                    ]
                },
                {
                    "id": "iQpJYxxZXZkI",
                    "name": "wf_diagnostics",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-07T11:19:00.2874678+00:00",
                            "to": "2025-03-11T12:07:00.5677914+00:00"
                        }
                    ]
                }
            ]
        },
        {
            "group": "Digital Channel Providers",
            "items": [
                {
                    "id": "54zaCCeGZmiw",
                    "name": "Cobra HrAfdeling",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-09T02:52:00.3387547+00:00",
                            "to": "2025-03-11T12:07:02.4984266+00:00"
                        }
                    ]
                },
                {
                    "id": "5X6MVpONohKw",
                    "name": "SD Worx People 005",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T20:24:01.0014738+00:00",
                            "to": "2025-03-11T12:07:01.8263781+00:00"
                        }
                    ]
                },
                {
                    "id": "5djhgN43Xg9v",
                    "name": "Proxy HR Selfservice",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T16:14:01.9294562+00:00",
                            "to": "2025-03-11T12:07:02.1336654+00:00"
                        }
                    ]
                },
                {
                    "id": "9kPXEBYw6dnt",
                    "name": "SD Worx People 004",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-07T17:09:01.4873211+00:00",
                            "to": "2025-03-11T12:07:01.8290228+00:00"
                        }
                    ]
                },
                {
                    "id": "Gea2BIHri0Sx",
                    "name": "SD Worx People 010",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T10:14:01.4909112+00:00",
                            "to": "2025-03-11T12:07:01.5195676+00:00"
                        },
                        {
                            "state": "Unhealthy",
                            "message": "Pulse check failed due timeout",
                            "from": "2025-03-11T10:13:10.600903+00:00",
                            "to": "2025-03-11T10:14:01.4231012+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-07T17:09:01.1791607+00:00",
                            "to": "2025-03-11T10:13:10.5725212+00:00"
                        }
                    ]
                },
                {
                    "id": "IwuoTXRqkYHQ",
                    "name": "Cobra MijnCTB",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-02-28T22:20:00.9037182+00:00",
                            "to": "2025-03-11T12:07:02.3501174+00:00"
                        }
                    ]
                },
                {
                    "id": "KAGAOoMHkEPt",
                    "name": "SD Worx People 014",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T06:43:00.8217305+00:00",
                            "to": "2025-03-11T12:07:01.2601276+00:00"
                        },
                        {
                            "state": "Unhealthy",
                            "message": "Pulse check failed due timeout",
                            "from": "2025-03-11T06:42:11.4548018+00:00",
                            "to": "2025-03-11T06:43:00.743662+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-08T09:38:01.7040745+00:00",
                            "to": "2025-03-11T06:42:10.6115359+00:00"
                        }
                    ]
                },
                {
                    "id": "LRUXCIhtXmxU",
                    "name": "Cobra MWAM",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-05T19:31:02.9640973+00:00",
                            "to": "2025-03-11T12:07:02.4903663+00:00"
                        }
                    ]
                },
                {
                    "id": "LRtUoTi0ul8K",
                    "name": "MS Graph Adapter",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T01:14:02.3015108+00:00",
                            "to": "2025-03-11T12:07:02.276837+00:00"
                        }
                    ]
                },
                {
                    "id": "LnPkxG7s3195",
                    "name": "SD Worx People 001",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T20:12:01.0652557+00:00",
                            "to": "2025-03-11T12:07:02.0395829+00:00"
                        }
                    ]
                },
                {
                    "id": "LnPkxG7s37b0",
                    "name": "SD Worx People 007",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T05:29:00.8235382+00:00",
                            "to": "2025-03-11T12:07:01.6947639+00:00"
                        }
                    ]
                },
                {
                    "id": "Mr8K4fkITLyV",
                    "name": "SD Worx People 011",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-08T08:18:00.9801067+00:00",
                            "to": "2025-03-11T12:07:01.3936626+00:00"
                        }
                    ]
                },
                {
                    "id": "NspQey4aKMIX",
                    "name": "Whistleblowing",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T01:07:00.5531444+00:00",
                            "to": "2025-03-11T12:07:01.1017905+00:00"
                        },
                        {
                            "state": "Degraded",
                            "message": "Pulse check took longer than the expected 5000ms",
                            "from": "2025-03-11T01:06:06.0893939+00:00",
                            "to": "2025-03-11T01:07:00.4799674+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-02-24T07:57:15.0085482+00:00",
                            "to": "2025-03-11T01:06:06.0559614+00:00"
                        }
                    ]
                },
                {
                    "id": "QHRNVgnWMk8Z",
                    "name": "MyServicePoint",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T10:04:01.3902626+00:00",
                            "to": "2025-03-11T12:07:02.1423171+00:00"
                        },
                        {
                            "state": "Degraded",
                            "message": "Pulse check took longer than the expected 5000ms",
                            "from": "2025-03-11T10:03:08.3158944+00:00",
                            "to": "2025-03-11T10:04:01.3626999+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T09:11:06.4595627+00:00",
                            "to": "2025-03-11T10:03:08.2899703+00:00"
                        },
                        {
                            "state": "Degraded",
                            "message": "Pulse check took longer than the expected 5000ms",
                            "from": "2025-03-11T09:10:07.2638389+00:00",
                            "to": "2025-03-11T09:11:06.4404249+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T08:52:02.2299847+00:00",
                            "to": "2025-03-11T09:10:07.2159236+00:00"
                        },
                        {
                            "state": "Degraded",
                            "message": "Pulse check took longer than the expected 5000ms",
                            "from": "2025-03-11T08:51:06.191284+00:00",
                            "to": "2025-03-11T08:52:02.1860325+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T05:37:02.7166075+00:00",
                            "to": "2025-03-11T08:51:05.9324138+00:00"
                        },
                        {
                            "state": "Degraded",
                            "message": "Pulse check took longer than the expected 5000ms",
                            "from": "2025-03-11T05:36:08.6287014+00:00",
                            "to": "2025-03-11T05:37:02.6968743+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T04:46:01.370104+00:00",
                            "to": "2025-03-11T05:36:08.5959585+00:00"
                        },
                        {
                            "state": "Degraded",
                            "message": "Pulse check took longer than the expected 5000ms",
                            "from": "2025-03-11T04:45:06.2861128+00:00",
                            "to": "2025-03-11T04:46:01.3414952+00:00"
                        },
                        {
                            "state": "Degraded",
                            "message": "Pulse check took longer than the expected 5000ms",
                            "from": "2025-03-11T04:44:07.1523459+00:00",
                            "to": "2025-03-11T04:45:06.2286224+00:00"
                        },
                        {
                            "state": "Unhealthy",
                            "message": "Pulse check failed due timeout",
                            "from": "2025-03-11T04:43:12.7816536+00:00",
                            "to": "2025-03-11T04:44:07.1337862+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T04:13:01.3745578+00:00",
                            "to": "2025-03-11T04:43:12.7429879+00:00"
                        },
                        {
                            "state": "Degraded",
                            "message": "Pulse check took longer than the expected 5000ms",
                            "from": "2025-03-11T04:12:09.7485171+00:00",
                            "to": "2025-03-11T04:13:01.3552873+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T02:53:05.626333+00:00",
                            "to": "2025-03-11T04:12:09.7303387+00:00"
                        },
                        {
                            "state": "Degraded",
                            "message": "Pulse check took longer than the expected 5000ms",
                            "from": "2025-03-11T02:52:07.4420845+00:00",
                            "to": "2025-03-11T02:53:05.5580844+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T01:16:02.3569701+00:00",
                            "to": "2025-03-11T02:52:07.4233878+00:00"
                        },
                        {
                            "state": "Degraded",
                            "message": "Pulse check took longer than the expected 5000ms",
                            "from": "2025-03-11T01:15:06.9232758+00:00",
                            "to": "2025-03-11T01:16:02.3415635+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T00:10:02.0035843+00:00",
                            "to": "2025-03-11T01:15:06.8960517+00:00"
                        },
                        {
                            "state": "Degraded",
                            "message": "Pulse check took longer than the expected 5000ms",
                            "from": "2025-03-11T00:09:06.2274342+00:00",
                            "to": "2025-03-11T00:10:01.9657532+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T23:52:03.5950081+00:00",
                            "to": "2025-03-11T00:09:06.2105376+00:00"
                        }
                    ]
                },
                {
                    "id": "QJrxPPYuw1Sr",
                    "name": "SD Worx People 013",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T11:24:00.9645032+00:00",
                            "to": "2025-03-11T12:07:01.2951105+00:00"
                        },
                        {
                            "state": "Unhealthy",
                            "message": "Pulse check failed due timeout",
                            "from": "2025-03-11T11:23:11.8128308+00:00",
                            "to": "2025-03-11T11:24:00.9430909+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T09:14:01.3083771+00:00",
                            "to": "2025-03-11T11:23:11.7082538+00:00"
                        },
                        {
                            "state": "Unhealthy",
                            "message": "Pulse check failed due timeout",
                            "from": "2025-03-11T09:13:11.0974994+00:00",
                            "to": "2025-03-11T09:14:01.2578442+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T08:14:00.7263217+00:00",
                            "to": "2025-03-11T09:13:11.0590714+00:00"
                        },
                        {
                            "state": "Unhealthy",
                            "message": "Pulse check failed due timeout",
                            "from": "2025-03-11T08:13:11.3076626+00:00",
                            "to": "2025-03-11T08:14:00.6074784+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T06:54:00.6685586+00:00",
                            "to": "2025-03-11T08:13:11.2804732+00:00"
                        },
                        {
                            "state": "Unhealthy",
                            "message": "Pulse check failed due timeout",
                            "from": "2025-03-11T06:53:12.9524741+00:00",
                            "to": "2025-03-11T06:54:00.6355244+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-07T21:04:01.8206682+00:00",
                            "to": "2025-03-11T06:53:12.923451+00:00"
                        }
                    ]
                },
                {
                    "id": "QRiKyt0uOl2T",
                    "name": "MijnLoon",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T23:53:04.3729821+00:00",
                            "to": "2025-03-11T12:07:02.2569653+00:00"
                        }
                    ]
                },
                {
                    "id": "QWngzYK1RiF4",
                    "name": "Cobra HeliPortal",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T23:54:00.6449268+00:00",
                            "to": "2025-03-11T12:07:02.5977547+00:00"
                        }
                    ]
                },
                {
                    "id": "QqaHJkUOKgDg",
                    "name": "SD Worx People 006",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T05:29:00.7817901+00:00",
                            "to": "2025-03-11T12:07:01.7515324+00:00"
                        }
                    ]
                },
                {
                    "id": "bxM6RVe5FG8j",
                    "name": "SD Worx People 008",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T20:12:01.5831315+00:00",
                            "to": "2025-03-11T12:07:01.5414345+00:00"
                        }
                    ]
                },
                {
                    "id": "bxM6RVe5FGYS",
                    "name": "SD Worx People 002",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-08T08:17:02.2905715+00:00",
                            "to": "2025-03-11T12:07:01.8827675+00:00"
                        }
                    ]
                },
                {
                    "id": "m9HCcV5XwXWH",
                    "name": "Buddy",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T11:46:01.9729401+00:00",
                            "to": "2025-03-11T12:07:02.6055406+00:00"
                        }
                    ]
                },
                {
                    "id": "pXRLtFdzEbby",
                    "name": "Company Owner Service",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T02:02:00.3879452+00:00",
                            "to": "2025-03-11T12:07:02.3787877+00:00"
                        },
                        {
                            "state": "Unhealthy",
                            "message": "Pulse check failed due timeout",
                            "from": "2025-03-11T02:01:10.5384997+00:00",
                            "to": "2025-03-11T02:02:00.3612377+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-09T02:02:01.8578522+00:00",
                            "to": "2025-03-11T02:01:10.516078+00:00"
                        }
                    ]
                },
                {
                    "id": "pnqtXgsXqLt2",
                    "name": "eBloxHR Adapter",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T10:35:00.9806036+00:00",
                            "to": "2025-03-11T12:07:01.2496718+00:00"
                        },
                        {
                            "state": "Degraded",
                            "message": "Pulse check took longer than the expected 5000ms",
                            "from": "2025-03-11T10:34:08.015082+00:00",
                            "to": "2025-03-11T10:35:00.9238723+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T02:02:01.1338456+00:00",
                            "to": "2025-03-11T10:34:07.9965026+00:00"
                        },
                        {
                            "state": "Unhealthy",
                            "message": "Pulse check failed due timeout",
                            "from": "2025-03-11T02:01:12.0180275+00:00",
                            "to": "2025-03-11T02:02:01.1088589+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T22:58:01.596569+00:00",
                            "to": "2025-03-11T02:01:12.0026888+00:00"
                        }
                    ]
                },
                {
                    "id": "rERvn5MdZJSZ",
                    "name": "1DX",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T02:37:01.1470713+00:00",
                            "to": "2025-03-11T12:07:02.6260354+00:00"
                        },
                        {
                            "state": "Degraded",
                            "message": "Pulse check took longer than the expected 5000ms",
                            "from": "2025-03-11T02:36:06.2640811+00:00",
                            "to": "2025-03-11T02:37:01.1312962+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T08:24:01.2176203+00:00",
                            "to": "2025-03-11T02:36:06.2090808+00:00"
                        }
                    ]
                },
                {
                    "id": "rFZaPIYokIt6",
                    "name": "Monizze Adapter",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T05:16:00.2913376+00:00",
                            "to": "2025-03-11T12:07:02.1516003+00:00"
                        },
                        {
                            "state": "Degraded",
                            "message": "Pulse check took longer than the expected 5000ms",
                            "from": "2025-03-11T05:15:06.2371685+00:00",
                            "to": "2025-03-11T05:16:00.2599117+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-06T09:16:01.1268712+00:00",
                            "to": "2025-03-11T05:15:06.2106029+00:00"
                        }
                    ]
                },
                {
                    "id": "snRDb4F4sCZf",
                    "name": "UKPortal",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T09:28:01.4572579+00:00",
                            "to": "2025-03-11T12:07:01.1481382+00:00"
                        },
                        {
                            "state": "Unhealthy",
                            "message": "Pulse check failed due to deserialization error",
                            "from": "2025-03-11T09:27:00.7531129+00:00",
                            "to": "2025-03-11T09:28:01.4101236+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T02:03:00.8805241+00:00",
                            "to": "2025-03-11T09:27:00.710652+00:00"
                        },
                        {
                            "state": "Degraded",
                            "message": "Pulse check took longer than the expected 5000ms",
                            "from": "2025-03-11T02:02:09.7458386+00:00",
                            "to": "2025-03-11T02:03:00.8352345+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T02:03:00.7053708+00:00",
                            "to": "2025-03-11T02:02:09.7301125+00:00"
                        }
                    ]
                },
                {
                    "id": "thl6feztGtTP",
                    "name": "SD Worx People 012",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T06:43:00.9550684+00:00",
                            "to": "2025-03-11T12:07:01.349156+00:00"
                        },
                        {
                            "state": "Unhealthy",
                            "message": "Pulse check failed due timeout",
                            "from": "2025-03-11T06:42:11.6605318+00:00",
                            "to": "2025-03-11T06:43:00.9079886+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T13:14:01.4900349+00:00",
                            "to": "2025-03-11T06:42:11.6442089+00:00"
                        }
                    ]
                },
                {
                    "id": "vNPTnYqTWLWC",
                    "name": "Digital Service Sheet",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T02:02:00.3699951+00:00",
                            "to": "2025-03-11T12:07:02.3385281+00:00"
                        },
                        {
                            "state": "Degraded",
                            "message": "Pulse check took longer than the expected 5000ms",
                            "from": "2025-03-11T02:01:07.9544664+00:00",
                            "to": "2025-03-11T02:02:00.3352232+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T23:54:00.322344+00:00",
                            "to": "2025-03-11T02:01:07.9364219+00:00"
                        }
                    ]
                },
                {
                    "id": "zXe7iepmFaQ",
                    "name": "SD Worx People 003",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T10:14:01.8324578+00:00",
                            "to": "2025-03-11T12:07:01.8632512+00:00"
                        },
                        {
                            "state": "Unhealthy",
                            "message": "Pulse check failed due timeout",
                            "from": "2025-03-11T10:13:10.7543268+00:00",
                            "to": "2025-03-11T10:14:01.8021926+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T09:09:02.6197795+00:00",
                            "to": "2025-03-11T10:13:10.7252453+00:00"
                        }
                    ]
                },
                {
                    "id": "zXe7iepmGYT",
                    "name": "SD Worx People 009",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-08T08:18:01.1537023+00:00",
                            "to": "2025-03-11T12:07:01.5224399+00:00"
                        }
                    ]
                }
            ]
        },
        {
            "group": "",
            "items": [
                {
                    "id": "9gzKS2wEuIrV",
                    "name": "Photo Service",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T09:40:00.5118548+00:00",
                            "to": "2025-03-11T12:07:02.6966055+00:00"
                        },
                        {
                            "state": "Unhealthy",
                            "message": "Pulse check failed due timeout",
                            "from": "2025-03-11T09:39:17.3283212+00:00",
                            "to": "2025-03-11T09:40:00.4390015+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-11T07:35:00.3155876+00:00",
                            "to": "2025-03-11T09:39:17.1863302+00:00"
                        },
                        {
                            "state": "Unhealthy",
                            "message": "Pulse check failed due to mismatched JSON",
                            "from": "2025-03-11T07:34:02.0502339+00:00",
                            "to": "2025-03-11T07:35:00.2884542+00:00"
                        },
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-06T14:00:09.7230051+00:00",
                            "to": "2025-03-11T07:34:02.0320453+00:00"
                        }
                    ]
                },
                {
                    "id": "qTQaWDOfsQbi",
                    "name": "Messaging API",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T15:39:00.1796113+00:00",
                            "to": "2025-03-11T12:07:00.4638313+00:00"
                        }
                    ]
                }
            ]
        },
        {
            "group": "SDConnect 3.0",
            "items": [
                {
                    "id": "E55FQ241wWZs",
                    "name": "Channels",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-07T20:34:03.2555748+00:00",
                            "to": "2025-03-11T12:07:00.626113+00:00"
                        }
                    ]
                },
                {
                    "id": "YUg1GI7tn5vR",
                    "name": "APIM",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T20:15:02.7483053+00:00",
                            "to": "2025-03-11T12:07:00.6589238+00:00"
                        }
                    ]
                },
                {
                    "id": "qxVV4Q5Hjrim",
                    "name": "API",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T20:15:02.8002881+00:00",
                            "to": "2025-03-11T12:07:00.6849079+00:00"
                        }
                    ]
                }
            ]
        },
        {
            "group": "Digital Channels.Internal",
            "items": [
                {
                    "id": "Sc2FNBZB2jeY",
                    "name": "Channels API",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-02-14T23:20:00.367061+00:00",
                            "to": "2025-03-11T12:07:00.7938435+00:00"
                        }
                    ]
                },
                {
                    "id": "aocYaNLyCbkF",
                    "name": "mysdworx",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-02-27T13:45:02.3994783+00:00",
                            "to": "2025-03-11T12:07:00.6434282+00:00"
                        }
                    ]
                },
                {
                    "id": "k8PxXupb9cQ",
                    "name": "Features API",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T17:10:00.6258268+00:00",
                            "to": "2025-03-11T12:07:00.8235139+00:00"
                        }
                    ]
                },
                {
                    "id": "stAbVjGlHkE0",
                    "name": "Functionalities API",
                    "items": [
                        {
                            "state": "Healthy",
                            "message": "Pulse check succeeded",
                            "from": "2025-03-10T20:14:01.1392099+00:00",
                            "to": "2025-03-11T12:07:00.7924509+00:00"
                        }
                    ]
                }
            ]
        }
    ];

    function handleData(/** @type {PulseGroup[]} */data) {
        const overviewCard = document.querySelector('#overview-card');
        if (!overviewCard) {
            console.error('Error getting overview-card');
            return;
        }

        if (!data) {
            overviewCard.innerHTML = 'Error loading...';
            return undefined;
        }

        sortAndFormatData(data);

        overviewCard.innerHTML = '';

        const listGroup = createListGroup(data);
        overviewCard.appendChild(listGroup);
    }

    function sortAndFormatData(data) {
        data.sort((a, b) => {
            if (a.group === '') return 1;
            if (b.group === '') return -1;
            return a.group.localeCompare(b.group);
        });

        data.forEach(group => {
            group.id = 'group-' + formatId(group.group);
            group.items.sort((a, b) => a.name.localeCompare(b.name));
        });
    }

    function createListGroup(/** @type {PulseGroup[]} */groups) {
        const list = document.createElement('div');
        list.className = 'list-group list-group-flush';

        groups.forEach(group => {
            if (!!group.group) {
                createListGroupEntry(group, group.group, group.id, group.id, false);
            }

            group.items.forEach(groupItem => {
                createListGroupEntry(groupItem, groupItem.name, groupItem.id, group.id, group.group);
            });
        });

        return list;

        function createListGroupEntry(item, text, id, toggleGroup, indentGroup) {
            const a = document.createElement('a');
            a.className = 'list-group-item list-group-item-action rounded pulse-selection d-flex flex-row';

            if ('group' in item) {
                a.href = '#';
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.querySelectorAll('.pulse-selection-' + toggleGroup).forEach(x => {
                        x.classList.toggle('d-none');
                    });
                });
            } else {
                a.href = '#' + id;
                a.id = 'pulse-selection-' + id;
                a.addEventListener('click', () => {
                    showDetails(item, indentGroup);
                });

                if (!!indentGroup) {
                    a.classList.add('pulse-selection-' + toggleGroup);
                    a.classList.add('d-none');
                }
            }

            const textSpan = document.createElement('span');
            textSpan.textContent = text;
            textSpan.className = 'flex-grow-1';

            if (!!indentGroup) {
                textSpan.classList.add('ms-4');
            }

            a.appendChild(textSpan);

            a.appendChild(createHealthBar(item))

            list.appendChild(a);
        }

        function createHealthBar(item) {
            const healthBar = document.createElement('div');
            healthBar.className = 'healthbar-tiny d-flex flex-row border rounded p-1 gap-1 bg-body-secondary m-auto';
            const totalHours = 12;
            const bucketSize = totalHours / 10;
            const buckets = Array.from({ length: 10 }, (_, i) => ({
                start: new Date(Date.now() - (totalHours - i * bucketSize) * 60 * 60 * 1000),
                end: new Date(Date.now() - (totalHours - (i + 1) * bucketSize) * 60 * 60 * 1000),
                state: 'Unknown'
            }));

            const pulses = 'group' in item ? item.items.flatMap(groupItem => groupItem.items) : item.items;

            pulses.forEach(pulse => {
                const from = new Date(pulse.from);
                const to = new Date(pulse.to);
                buckets.forEach(bucket => {
                    if (from < bucket.end && to > bucket.start) {
                        const states = ['Healthy', 'Degraded', 'Unhealthy'];
                        const worstStateIndex = Math.max(states.indexOf(pulse.state), states.indexOf(bucket.state));
                        bucket.state = states[worstStateIndex];
                    }
                });
            });

            buckets.forEach(bucket => {
                const bucketDiv = document.createElement('div');
                bucketDiv.className = 'rounded';

                if (bucket.state === 'Healthy') {
                    bucketDiv.classList.add('text-bg-success');
                } else if (bucket.state === 'Degraded') {
                    bucketDiv.classList.add('text-bg-warning');
                } else if (bucket.state === 'Unhealthy') {
                    bucketDiv.classList.add('text-bg-danger');
                } else {
                    bucketDiv.classList.add('text-bg-secondary');
                }

                healthBar.appendChild(bucketDiv);
            });

            return healthBar;
        }
    }

    function showDetails(/** @type {PulseGroupItem} */item, /** @type {string} */group) {
        const header = !!group 
            ? `${group} > ${item.name}`
            : item.name;

        setDetailsHeader(header);
        markPulseAsActive('pulse-selection-' + item.id);
    }

    function showDetailsForId(data, /** @type {string} */idToShow) {
        let groupToShow;
        let itemToShow;

        if (idToShow) {
            idToShow = idToShow.replace(/^pulse-selection-/, '');

            data.some(group => {
                if (group.id === idToShow) {
                    itemToShow = group;
                    return true;
                }

                return group.items.some(item => {
                    if (item.id === idToShow) {
                        itemToShow = item;
                        groupToShow = group;
                        return true;
                    }
                    return false;
                });
            });
        }

        if (!!itemToShow) {
            showDetails(itemToShow, groupToShow.group);
        }

    }

    function setDetailsHeader(value) {
        const detailCardHeader = document.querySelector('#detail-card-header');
        if (detailCardHeader) {
            detailCardHeader.textContent = value;
        } else {
            console.error('Error getting detail-card-header');
        }
    }

    function markPulseAsActive(id) {
        const activeElement = document.querySelector('.pulse-selection.list-group-item.active');
        if (activeElement) {
            activeElement.classList.remove('active');
        }
        const newActiveElement = document.querySelector('#' + id);
        if (newActiveElement) {
            newActiveElement.classList.add('active');

            const classList = Array.from(newActiveElement.classList);
            const groupClass = classList.find(cls => cls.startsWith('pulse-selection-group'));
            if (groupClass) {
                document.querySelectorAll('.' + groupClass).forEach(element => {
                    element.classList.remove('d-none');
                });
            }
        }
    }

    handleData(data);
    showDetailsForId(data, window.location.hash.substring(1));
})();