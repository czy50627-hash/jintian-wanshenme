import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {
  MapPin,Share2,RotateCcw,Menu,Car,Bus,Clock3,Star,
  ShieldCheck,Heart,ArrowLeft,ExternalLink,CalendarDays,Umbrella,
  TreePine,House,WalletCards,Navigation,Utensils,ParkingCircle,
  Baby,Accessibility,SunMedium
} from "lucide-react";
import {evaluateRecommendations,evaluateCandidatePreview} from "./engine/recommend.js";
import {generateEvidenceReason} from "./engine/reasonGenerator.js";
import {normalizePlace} from "./lib/normalizePlace.js";
import {priceLabel} from "./lib/pricing.js";
import "./styles.css";

const AGES=[
  {id:"0-2",label:"0–2歲",sub:"幼兒"},
  {id:"3-5",label:"3–5歲",sub:"學齡前"},
  {id:"6-8",label:"6–8歲",sub:"國小低年級"},
  {id:"9-12",label:"9–12歲",sub:"國小高年級"}
];
const COUNTIES=["台北","新北","桃園","新竹","苗栗","台中","彰化","南投","雲林","嘉義","台南","高雄","屏東","宜蘭","花蓮","台東","基隆","澎湖","金門","連江"];
const CENTERS={"台北":[25.0478,121.5319],"新北":[25.012,121.4657],"桃園":[24.9937,121.301],"新竹":[24.8138,120.9675],"苗栗":[24.5602,120.8214],"台中":[24.1477,120.6736],"彰化":[24.0756,120.544],"南投":[23.9609,120.9719],"雲林":[23.7092,120.4313],"嘉義":[23.4801,120.4491],"台南":[22.9999,120.227],"高雄":[22.6273,120.3014],"屏東":[22.6761,120.4942],"宜蘭":[24.7021,121.7378],"花蓮":[23.9911,121.6112],"台東":[22.7554,121.15],"基隆":[25.1276,121.7392],"澎湖":[23.5655,119.5863],"金門":[24.4368,118.3171],"連江":[26.1605,119.9517]};

const HERO_BG="data:image/webp;base64,UklGRnAaAABXRUJQVlA4IGQaAABQhACdASpAAb4AP0WKt1SwKSU5sFisQzAoiWxtgsiSAiebg6ss/pkXM+8Sw8cHPpz5wHq554TTgJWb8b/53ib5+hexyR8PzVhxyBS2Wdc8FP3qNUPi7AvKs9+ZoPT3bU3Ep6DSeKl+AVR+DhY5deJpqWTHzoJ/xHOX4XcyKpf728/w/g2kx0kqlMBdczhzm1IkBcgDuBnJc1Zz6i/tTsZoMs31Z/BPEQkC5sr7EOU4F8yRqT74EvOxus6sJPSqQSAjgUHFyouKckHjb+UEu9kFoxP5cnk72FgIAbM95rz1ofvh1ARemmjpSRK0d1qnJXhLZZ8XqSK8znXed+OOFxDKsSkRHifm7GAamWBvjZHwYlm6WEaSdntIUucpXqSe63ZQckPERIgOzN3srqqlI9qTxHgEXx+aeHC8PYIZ/S4R9kDRVxvRGnm967HP97CaUfzBnmceFPiDijRScW+/C/YmmXFWQRfAvKX2FvprCKbH0+4RT6WSmaljIM7P4fp5ANj4O2hVoUeumrZWKiUa+G2fXXsBUuR8dMdiEIHWeCvIjVajDDUSe1HhD1hhVfS4CvFvfcLn/69QrXgzPybOWHANE2Jp/kEPkgeC8ZVk8pgrdzVpZpbP+mttDq6zS846udKv9kU+zeQZ7TzOS8xuJVW+6BnCRWRDDfxK7+YydLt8/vKXBjV3KhpaYeJaDPp4HWJTG/QM8ZVLEXNlHPVllMON15xIYcLdbhJXYmKk8vu42ZjMlQC6ASHLqSg0B+0BEzHIrhbmqXbY9AuNMu0WuYobt6DUXAfDKFzrUEKk64GMj0abVA906+xoaIJ/gHE4VkgLxduuehPQ8ab3GJnsiQNZdSOKfDtDoQM5q4kkkIFzQf+5FQwU3um9p2anRPdYiMuAs9v1oMYMXbhrL+eWsv9sUAdXDLRbeNwrTa/Dfh+Mv3EZxa30Ntydm5Rv6F3SNieknR4Y91gDOP8q6Su6bRB2iX9MvIwVjEoQNOauZjns8hf5NAe3l7Sqy1O5g8mPhmJQm9juFgm/Sxm+vjix/jZ7HMpB67fTg25ETmRr4sLJmS2SSaCb9g750iXpMnQzKHLwPUa4lvEn7fH1vDgKQIgkvN1v6gCZCbvdvHeuqJa04cEjQJRxgURTBEXVUOQB/7xCcFUzDtlHOoUOHQpknkC8PbjxR9qn4878BU+zJOwoxPY0c04DIERj/mS8FcSKd8IzDFIvmpItV7pEVzXT2Ugvnm5ISQa3RwJiBG9ruHWpxKg3qMf0IXD3YuFiRpAbohPlblHI2poLEkfKYD0ki9h1J0Om0hYvXelXbd84VoJ6bszsy4F7dvrh0HQ8Y5cVIj8MUBv6+nuUxsuiOfBSCRjNYP4Z2wOYZZrmuEW1yp3+frboga5cT+O5VkrdobSBRpzEKjQeHbVqzymGAAD+0DJCL8guktx2bCthsG9I7S1mTTvpE1pG2Em6QC6tFXg9ncN4PGtLjAyKdYN2hxmsnfln36rnkmnVKpy3AqxJg5lMR0GtVB5Nso3EWS/Lkg2RXFsv3pRDz1HpijQW4Yglxl+xGEHBcT1EYyP6mf7CrXOZUsT5ajq5cDJrGC+w8LK/50w3qXfWsS5gOdd4cE98sh6qhZoJSB86f7paxcVbnBusucQBnztILMihI7am4AzYOfRNkslqSONgpxAQNggtcCwFMAyRuH+jGaveH3fnFwKLq/JQ/Dg+xdRINZis9BJWuKei8xMJDOG+nr1q/do724wrINAm6L/r7UAmbdayC59rLiRGW0ooSe53kxsbOIQtCiN2qB7dZ8wHUPHAVDSLsXk8wGRuQGPH2v5R/RWggjM89/ZBzniBqI3EYynd1p+/s3eznrgoYa+HoGLBbbhgdC8e2l1edEAm1zy4wrPEp+thPE/GvosNgxrf0+hva6S3CJn2C1zK9tJXgMSZGSEZuAcpWPlB6RdUBJyn2Fe3DISzKhTNzQ6p2H8O9QStyJOy1COM1eIZ7n76r5t8sQ6sQ+NwaVESBRvQ1Rvn4bukKWUeKrRyjSNdKIbn8CbqGJoG52saIyhT8PjfhLrtx9SHaQGwvlLIe3xHoBRlxekbQyilxeHTNAXLSQsr2xMnJjWAfdE5yRX+MjBXJmA+MoOSesAAJGK1yfFq9uwHEiTmkU4v4Hp5ZdX2bqD+GzXHSjTkwSsf1N/Q0TIF13Ch2zJLA4kh6lX8WLlRP+E2OnH9cl2v2MNNaSWwZINu5HpV0fngiRKjEhx/vS08p5cK4WWPAeFSq4it20d+jxAZebB9GvzUp9oQg7iXBmwMHP8RqT8ARS1VrnthHqMFGz/ikLUUzCFlT/UHoCuq+rxF18y+ru7Dsd8zyNkcy8TvtXvPplQ9eyn2mZYRWs+REd/Zi0EfiSfZRsdX5Pi+b9BUnwQPDUkruaWw4Kv+Jbm8oC/Cffpui/A5KtkDRTYRjoo0dcXtnouLaim9/Vm2Y32aE4KNsJTwsQQj5BmFVGiEnnyfTeF9Ia+RDvj0J7NNbVQuINLeDaX7bSmOpauR4o4yIghaTIRDbC5loTJPw+C9Wms4KN5zkuhAdZL6vPb3mkO30WJoXW53BgfWll403pun8MEW1ksBRQ8gh+y/RJSLDCtCCovcbDbFV1xkg43wpPXNbYJPuwkmJ6BQ0EOz6811hJ196cQw2yG6a3Vvf+9S5aBYFn/ylqLqEB7FZZi84rIQ3PHWzzWw1JtPqr4Z3YcWd1Un2qEN+si24n91iP1lnYu9hzZY25V5sGU21PR5u3D/NN433+BkGbbn97itZknE/CtNt8Wcg2f5KDsSpYONsEn6Wr5FmfAc4co/eEKA8kY6SF+AEYIv/s61dryz1zexJniDTrw25q4/pFGjSH1LOd0KtfNceqza7sIDd2BNLKvINDNvfy5hQ/fev+hCbvI54TmRP2nMrZ7GTgtq9lEQh3XIlGVp+zLalHeEgioSzzGuzg3K8VdfEuJffqbiykPwN3jXm4LPPamH1gr8r4MzijGo6xOyeX9qgtXODCG6jM3WMDC3TQ7xR7pZFXFemS4Hm6lP2joOGqoGMNauvb2h6eQuWCPupc3rBlsqLyxPxK9Xvl729WrHCJbguPAEMX0yzc8boJtc95X2iCmUZY2jJ0xMYXspwAoGYNs7ENcxSZoIY72LL31L9mzYZsfspuZi3sRnog81jEz4ZGV/aSxCWWfKDcLLKdD1zDn2+IwDrbr8CDpNeg2/afosyHdc3BQn1YI6pUPXF2MPdmcYhcCObpTxc+yw12kDnmV40R2+IGpcNJoOla2brF7RKFMwylgi+eXZMTqq5eP0RDmz1nI95FiOmSxxvribTeOP3coMrTJFf+KcvhsW4PLIdy9z8R5ThbeAnjRcFaWokCNP5M4v2qsEZSNFGHthykurbJWZ2AkKbOXcavD3mDu7hI/kLHTDwZJdeENNFRd3gVSDU242ytNNE1JkGIvHWJGS2wbvR6UjMfe590TRiT4yo7AltXubfr9739C8uJ5k0nU/SsXZfBFYNjyFszOvCJH3Tk0oiWRKLrGggnQKwOweLpvNzgNTNBSfOitAlRg6l4JvR6e88+RFl08drcO2p1HR9n8OwuUVc//M3fHT6yqdcboIcBSUf1msMw0thREwMYybrYSSLbbUR7rooryylQJEK8c5xUHHWJchO43BZeye6+bWQ2l67bOZZ3qqIL/GEV4q9JHDLbjW53najAfd7DMeiI9LC1zR/XGW+qM+dc/xouRFkjg30qkUEltUTpNzH3Ld9igE1ayIGzJyfSHr2xkXo5U5s+WJX1SZbvW5ijet0u6jndugJAnDTbduHlob2LmlHIBAj5HNbgoQxvPdpSbBd1WqliCI/9XfuIhvUwVIMuQJrpBC7nyjZdilXEJuT5UooGSEu8aeQaCYLnx77z5wLbVVQ2ajobWgIBOkXS+DdIhmNiML+eIQY1Y4dH7mu97NceYVnRv1zZG3opWYueNgaFAU2gk+l1e1N1xj8WaTSd1NErJKYpaeqAnnV6ZoIO7QXJprlT5pCbiPfBj+6vgoHbNxWU1nSLg6dCGxlZ497mIKpWrGT479fWB4B+SGcRqB85ScKrLV7kmSs8CqMzUTK0TroIbS/uBW5O7ENsmmk6D8YZ8ojF68eaTkLzVOhIEmP+4W0hg35kO7rNaV7vueuNzz/n7A8BqJAtboAj3/QRkXoOwsZPbMQxbVKD5OeHnfITk3HNj4/XJbdiKV2CI1iNvUEzr4Inpk+3+cB0Xz0ebgBr/1zTLtZKc1KfV1fw1Wd/to0JIVg9/9QdNNCgfUf8kcBR3usvn9opVGYwfIv3xZnZ/LrhKAKMB8mOIop/BqLXbWFT+ktt2lvoaqQzppd44rCvI0yjSxrrrKDLUNcCTKmVO3ijZmApvZd2r1hVRrjxc27kCaN+3yeNbx6AP8XcU8UPPs/ZJeNGQP6Q14krbA9q8T72QcSsIq7oBV/vosXgtAkjdJKLafBKG1vATUgHp/vEhgC6vfO8thvTkNL+OcS9tnAyc67e1s4X/K5CyjO0iAhyRUh+W8Fyn4PW555xNeMbmSGed6+Ialam3L4HVyvJZVTuA8iDhxn+ZvnSep/rdtLoXblsVMRfYYA/3au2MUlZxxFP1//9IVyeryGFIVFOmN4WYxw3HgneyW03rK6reQxwZCjg1qar+lZqEmID02bR1XebO2EPy7qxzIH1yz/rPZMS5PCY8nhmzCcwMAxYV25TZr5W6N/un0bUhq2BEyFosVuhSU208lun5Ldx6RuEC1iwJFCgWQPso/L4dzkrv8t57jeJ0Crf/JWmguAZMODem6NDwymCbEFj1p4t5FCz4vqWK4qcMjFfiO4/sAm06hpVV6AgukXvtpFm8/290nU7MUyGEUHZFaVk3k0qTwnvLpPelKPwRfkWXmYZ610YiqxlxN6eGEnZzliX+HyV3X31pTV1ojq0Aa1XUzRr/TT4gtqlfDxZQofAnuSJGopAw3VUsrVtDsIDvO/0Zrf0SOdxv1DLgQqdDQEJRkKS06ghk/hq5qesvLnO9IJkuPPuIdI6bJClJ53/F+bNSzyY5gbBuxoqX1shMxMjWcGUmmlwWn6xpVN7IhBEey6qhMYmfVnnp6IWQXs5hH9h8wH/Rh9Ac1OSQ24D0++nLByZT16M+7t2HCFCCO7wUocmEZB7w6LqJICKEQLgggSpwQnL/DFUSloYTtovjtTfnTKHrStpz0D60B9I9nQ5h/PvViuR5/Sgjqau3kdx50fZedoOzi6l1WAKnm4fyf2HbYEfKfbV27q9EXKjPu6raYxwZyb8E4GvwSh+xIpIYZc9T1o98cEEim7IA7xGrA44Vc6iGHt3JWNtTQZcROjGmPnO4Lg1MBUsDGR5LEO37U68DoG5gLNTZfPnSpQ54BH/xp9qyNRjNdguZ5yblgr7GeO3UkOMRzYEJ7UXZi0DDfcQH/Mq/FVpX8MmYxCn+T/7ZiKH9QdoWgPLSpWq3VtGW9otPViV8//JY8gXVCrTUqj1CoxI5Ou0FxZncTn9TXnNzP7dSo1jvZaBcYqXBTULvvvrZtjkIJ1UH+clkId2+omJvvLtF5VjEiyafbsaqESztClSA3/r6JpyeX5ENDTIjZ0cMJkMoXXjZCjPPRGsAvrJLKmId1yaaYMKDL4NJULEAcu2JMwjy0zHBMBIaCEorTBhuDB7hwpjCJqh1H/hqUwayCMrc3ApfAShsb08KHZFfk5ILqWZhut8Qfhrd9zuLD+412eEYmqE7/7rf+NBHSJ5ZYVKoywDjI88PZ3iYHTP+JdNB//1XB0txy2z/Bo7mBCPch2WR7dGjXq0VGj+SLFcreITEI2mpYB5cZgjkJ77SPwtbqWpVI5W0xmwoQb+pq8micH23NUGy2lnUTKw+9BQvGmRUwXbCjzCUtAcdIQLAmHQOn5YChqrMRYPiltnrE/IfHyPcCTR6db5vp6LlzvqnzHCLsuxFOm+vaxGijfHjFvtzhboeTYWJbaLVSV+BjbckGxnLozqxMkinltx+iHsGuLc1ThFO/0BNeCWZJykFcSb/J6ssdac3Ea4u7TSG1HWi7PuZpDgGr2hzZvDGoZsvLEc/C55MIO9I13gpM7h2PEUkV9pFI8wG8F7yAo0RvsMowh0Nv5ccA82xCswIzvOX8dXezwjkOp6Bxhwaenb6nRqiZFFQ7Da6jKNp66lbU3pOvGb/9Hmb4j1TTl3zw8RpyWYwpsfEmhA4DIYf+JT4Pk7rR+KrZhutYSh1/pdSqQ8bXHyvXYhftCWvlN4W3+wNQVEErRTcEvUadpAE2LoXB8YMTEs+/wIGAt5XnJMgzen3I3ckzmlUY+S+7qfpBdWFqvrgMIoh+0svWQPz+L9l/bmVelztjQEe2wetndOp6mpERcRfdtcAPEL5KtojU8Kr3P2qotC/JLv9/c132TqxjIDhdVVXtAv2ksvk+0xBIdrdyhKlsU0zka/mrHqHMcxzu5qnAg8h3DW4IqA7dfa7Wr2Q549RdOQ4VxmwmU2bvCZc6hprOPkh8obXuZTW9DBV1qKb/ol9eyzAtB0emZ64mSyAISRba/hjuihJpoQLEeYPZuk1C7NSYZc75AFIl2BjCD54QQbqexrvOLRpVAG3rhZ2Khm2Ub/ZSWAZfuDEZnQFJvk98pc0tRWTJpY0YNM8dUiHdlCPpDPebyNi1cAYiapY+wrZg+GpTCBePUmjg/WDuotVJ3yBZTl3Jeh8EEUdMYFrhDC5cqLfR8rT0W53fttK25TRrcwmBuQk1ba7HskyJbzGU1moOnzpj8QOYUYOiptNf8rO88pb0jIMDoKoD3mMj30hSBNPzbeh30uYQAiLe4iTpOgpR8NZe5HohBTuEtMg2h01ioRgwWqZN7cSAS/5H3U4FwO4iW6mIoFR44tx7NkqHPwOwxd+IxwarDistQ/x8krOaVf88Kkcqz+hGGJO3NffhorKG3XNHDgG1Tmf3obT/UCO/y6gYDG0yRCqpiGQDHziGSRfHrEQeeatEeOOE16tDyWNbT2ZvAGeW780pKCKBnRZUaSKlojpj+JDDJTwsQCRfWZA7Xndtd4LDqToqf9MyjSy8jb39KLZazo23+dA4nLBxhN7yu+QAlY+N3vQDM/HG5bqn5cT5CPF6nz6dlGN2Wgod+svVC1mUInAjtKxFI3r5pR3XZb1ZQvfNSA81Vc59Rza75NAjznzzM5ufHbit2pznXKAF0dHRlflxuPa6ThIs8yw12GD0K9WlTKUBs7fgZ/JUHAbHTh/qOSjNuHZBGNuOSi/5YskmHrQbHWZAND4orskwhah5YGffn0Ki6Sb6V4p1gtgOyKOwNglqmiYkckhUqXWbgM3CRVrNod1MbKqpfMFE1WJMWZQr5Oe31V/8oa8N+ZBBMOdVqzSqGBDSGQ8CEwgnlJFgA6d4kEqcco+O3ztak1F+3tlYKDT0yYk0oxOlMZcCe9QAjosHmEpJQb3Q2ZVIyHRW+wl6DCCwqq1XnFIeXAQr2I98vmapRzja1rxTYtLAYI9k0m4AtvchbFUsXGfAeHFTWe3sFTVovw6tNWadmqA4ZafEXw0A3S9GvS2EV1vT51Q3qF3zVaZ3u1grUIKxiDvwJz1oddFl5oFTSek8e54yY7+t5wh/rkxRDsvOtE3w0aXiXZa3GqrUe8I9uRUfyVzzPPN1gKUwXnZSDrFsbRK/FXS50bgSz1r2+jjaUmDpiTmglizSB7yh5OP/atUKOwaqSzGI9xazX9rH0uBG+k9ZBYyrJw+12Q4bX5XQQuNFBw6g3VJ07LGmhr/kqFMFkkZKLsJZDtoszXszb6zp3rPLvq8tebMObbvECDf9amZ+X5aP4IyRJ0gMHstVlAlvL5gXfbJo2xQTbjUj1zpO457UJoF5L7Yk90IXwFnn3FzcAXYLxhziAauTrYE2VdUQyhT5lgrsjABTEJG52QzLTk4en+ToR8TIJNcXM0V7UDFpauSjJ+8WYbx2dY36YWDdv9VKqlddOJhCIsiXlkQjXLDeK9nSYxGVN/0qm6+H4c/cCg23cOx9auS5WvYewJccT2Lo+XjcOon/cqJkn0VDkkmWCijdM177e0XKP9DbvayTrZgBCCXKj0G/GH6dW3sNnU3NYmbKnWF2GxKmItMXekK78Q4vnSrhvCGJ58+xxAQiOUc/PwUzxYvu/VlZ/hdFuZvzlclo9mhhhDR3hBBiBI2v14+dHvwCeEETEUTuLGzGMxo2HLUj4T5zKNeSdoSyQjvERv2hP0oZvOYON7r7ZdtgEHwTTKThD6OO5bHgUKKwarZzRoSzKWIfpLwHGB4D1sowAf95+Y1eYX58F9a4nDDWZqaMzyS3fhmlpc9X2sqqweEMrW+Q5TbJLyr4RyFZm+F12uSIhw5sIj2VqFYVkP6iiCTz+Hh/AyOQJyeRQb+X/5JUsR4Xj7EAVdWjtmFwN5LzwL0CUWdKettEFlNwxmC6N61a1Nap6DWqDyToM2dhDHS6j0ekSseVhs1A6rST9Kiu4p4OOXHvW9OVwVacdoLppN7D0HD9I1Gio03iQRD5t8awxbuZsbTpmV24pSDYhVmBiHMQYqLuIWlCsjyKG2/PIZ1tp3H8mxQedDD2z71FLwHjTIXZLfBxixgfSGxvZlhjKstSWyYSJPBdQ5VVdtjwCxnHNThe83UzeriuwU8ITTddCafgWCZrcb8sBYsVpJEbGtxQzUdWof1tKiThCjYsvGPe1iM20Z1zdi9hM4Ew2ulr0EB2RVZRw4noFjvxqmhpQC0gNdHpYtDsq85FlmdpbNlrzZEBEOuwhL3gSrekWdnzUWAV3hLCSjHjCdHkLAmyBSmzkQZbh9a2qvf3gwLgOoU+uPtaj3rs2jJ1LWouJtvRjFs4Vz8NA+CMU9Qv9tFEpyaluulaSZSE6/Ve0GO/G0XQyddLOVMC1t8XwcS07i9m6gEv4129nu5WrsxLvREhbw5Eyi4sGFY6xsouv+vXwoQvaP+WmagZuudtlW9lf+MwA/TyNwfWEgPbXAuRD9nNUAA=";

function HeroIllustration(){
  return <img className="heroPhoto" src={HERO_BG} alt="" aria-hidden="true"/>;
}

function PlaceIllustration({kind="park",compact=false}){
  const isIndoor=["museum","indoor_play","aquarium","library","art","factory"].includes(kind);
  return <svg viewBox="0 0 420 220" className={compact?"placeArt compact":"placeArt"} aria-hidden="true">
    <rect width="420" height="220" rx="26" fill={isIndoor?"#eee9ff":"#9edfff"}/>
    {isIndoor ? <>
      <rect x="56" y="52" width="308" height="132" rx="18" fill="#fff6e3" stroke="#5f554a" strokeWidth="3"/>
      <rect x="84" y="76" width="74" height="80" rx="10" fill="#8fd2ef"/><rect x="174" y="76" width="74" height="80" rx="10" fill="#ffc96b"/><rect x="264" y="76" width="74" height="80" rx="10" fill="#9bd59c"/>
      <circle cx="121" cy="116" r="19" fill="#fff"/><path d="M111 117 q10-18 20 0 q-10 16-20 0" fill="#ea7c73"/>
    </> : <>
      <path d="M0 172 Q90 128 165 170 T420 152 V220 H0Z" fill="#8bce82"/><path d="M0 195 Q90 164 210 192 T420 178 V220 H0Z" fill="#b7df86"/>
      <g transform="translate(72 72)" stroke="#72513a" strokeWidth="3" strokeLinejoin="round"><rect x="0" y="44" width="88" height="62" rx="7" fill="#dfab65"/><path d="M-10 44 L44 0 L98 44Z" fill="#9a6a3c"/><path d="M44 14 v92"/><path d="M88 106 q38 15 52 44" fill="none"/></g>
      <g transform="translate(265 112)"><circle cx="0" cy="0" r="27" fill="#4c9a52"/><rect x="-5" y="15" width="10" height="55" fill="#7d5739"/><circle cx="35" cy="14" r="22" fill="#65ae5e"/><rect x="31" y="27" width="8" height="43" fill="#7d5739"/></g>
      <g transform="translate(185 146)"><circle cx="0" cy="0" r="10" fill="#f0ad79"/><rect x="-8" y="9" width="16" height="28" rx="7" fill="#ff866f"/><circle cx="42" cy="3" r="9" fill="#efad79"/><rect x="35" y="12" width="14" height="25" rx="6" fill="#6cc0dc"/></g>
    </>}
  </svg>
}

function App(){
 const [places,setPlaces]=useState([]);
 const [candidatePlaces,setCandidatePlaces]=useState([]);
 const [ages,setAges]=useState(["3-5"]);
 const [county,setCounty]=useState("台北");
 const [prefs,setPrefs]=useState(["auto"]);
 const [weather,setWeather]=useState(null);
 const [result,setResult]=useState(null);
 const [selectedPlace,setSelectedPlace]=useState(null);
 const [excluded,setExcluded]=useState([]);
 const [when,setWhen]=useState("now");
 const [notice,setNotice]=useState("");
 const [sharedPlace,setSharedPlace]=useState(null);
 const [userCoords,setUserCoords]=useState(null);
 const [maxDrive,setMaxDrive]=useState(30);
 const [transport,setTransport]=useState("drive");

 useEffect(()=>{
   Promise.all([fetch("/data/places.production.json").then(r=>r.json()),fetch("/data/places.json").then(r=>r.json())]).then(([prod,cand])=>{
     const pp=(prod.records||[]).map(normalizePlace), cp=(cand.records||[]).map(normalizePlace);
     setPlaces(pp);setCandidatePlaces(cp);
     const m=location.pathname.match(/^\/r\/([^/]+)/);
     if(m){
       const id=decodeURIComponent(m[1]); const q=new URLSearchParams(location.search); const found=pp.find(p=>p.id===id);
       if(found){
         const qa=(q.get("ages")||"").split(",").filter(Boolean); if(qa.length)setAges(qa);
         if(q.get("county"))setCounty(q.get("county")); if(q.get("when"))setWhen(q.get("when")); setSharedPlace(found);
       }
     }
   });
   try{const saved=JSON.parse(localStorage.getItem("jtw-family")||"null");if(saved?.ages?.length)setAges(saved.ages);if(saved?.county)setCounty(saved.county);if(saved?.prefs?.length)setPrefs(saved.prefs);if(saved?.maxDrive)setMaxDrive(saved.maxDrive);if(saved?.transport)setTransport(saved.transport)}catch{}
   if(navigator.geolocation) navigator.geolocation.getCurrentPosition(p=>setUserCoords({lat:p.coords.latitude,lng:p.coords.longitude}),()=>setUserCoords(null),{enableHighAccuracy:false,timeout:5000,maximumAge:600000});
 },[]);

 useEffect(()=>{localStorage.setItem("jtw-family",JSON.stringify({ages,county,prefs,maxDrive,transport}))},[ages,county,prefs,maxDrive,transport]);
 useEffect(()=>{
   const c=CENTERS[county];if(!c)return;
   const u="https://api.open-meteo.com/v1/forecast?latitude="+c[0]+"&longitude="+c[1]+"&current=temperature_2m&hourly=precipitation_probability&forecast_days=3&timezone=Asia%2FTaipei";
   fetch(u).then(r=>r.json()).then(d=>{const now=new Date();const i=Math.max(0,d.hourly.time.findIndex(t=>new Date(t)>=now));const offset=when==="tomorrow"?24:0;const arr=d.hourly.precipitation_probability.slice(i+offset,i+offset+6).filter(Number.isFinite);setWeather({temp:d.current?.temperature_2m,pop:arr.length?Math.max(...arr):null})}).catch(()=>setWeather(null));
 },[county,when]);

 const currentPrefs=useMemo(()=>({selectedCounty:county,userCoords,ages,when,maxDriveMinutes:maxDrive,playStyles:prefs,excludedPlaceIds:excluded,currentRainProb:weather?.pop??0}),[county,userCoords,ages,when,maxDrive,prefs,excluded,weather]);
 const production=useMemo(()=>evaluateRecommendations(places,currentPrefs),[places,currentPrefs]);
 const preview=useMemo(()=>evaluateCandidatePreview(candidatePlaces,currentPrefs),[candidatePlaces,currentPrefs]);

 function decide(){setExcluded([]);setResult(production.hero?production:(preview.hero?{...preview,preview:true,fallbackNote:"目前正式驗證資料庫尚未完成，先提供候選資料預覽；名稱與分類可供參考，座標、營業與設施尚未驗證。"}:production))}
 function toggleAge(a){setAges(v=>v.includes(a)?(v.length===1?v:v.filter(x=>x!==a)):[...v,a])}
 function togglePref(p){if(p==="auto"){setPrefs(["auto"]);return}setPrefs(v=>{const next=v.filter(x=>x!=="auto");return next.includes(p)?(next.length===1?["auto"]:next.filter(x=>x!==p)):[...next,p]})}
 function reroll(){if(!result?.hero)return;const ids=[result.hero,...(result.alternatives||[])].map(p=>p.id);const nextExcluded=[...new Set([...excluded,...ids])];setExcluded(nextExcluded);setResult(evaluateRecommendations(places,{...currentPrefs,excludedPlaceIds:nextExcluded}))}
 function share(p){const url=location.origin+"/r/"+p.id+"?ages="+ages.join(",")+"&county="+encodeURIComponent(county)+"&when="+when;if(navigator.share)navigator.share({title:p.name,text:"今天帶小孩去【"+p.name+"】好不好？",url}).catch(()=>{});else navigator.clipboard?.writeText(url).then(()=>setNotice("推薦連結已複製"))}
 function map(p){if(!p.isCoordinatePrecise){setNotice("此點位座標尚未完成驗證");return}window.open("https://www.google.com/maps/dir/?api=1&destination="+p.lat+","+p.lng,"_blank")}
 function typeLabel(p){return p.category==="park"?"公園・戶外":p.indoor&&!p.outdoor?"室內":"親子景點"}
 function reason(p){return generateEvidenceReason(p,currentPrefs)}
 function ageText(p){return (p.ageTags||[]).join("、")+"歲"}
 function showDetail(p){setSelectedPlace(p);window.scrollTo({top:0,behavior:"smooth"})}

 const detailPlace=sharedPlace||selectedPlace;
 if(detailPlace){
   return <main className="phoneShell detailPage">
     <div className="detailHero"><PlaceIllustration kind={detailPlace.category}/><button className="roundIcon backBtn" onClick={()=>{if(sharedPlace){history.pushState({},"","/");setSharedPlace(null)}else setSelectedPlace(null)}}><ArrowLeft size={22}/></button><div className="detailTools"><button className="roundIcon"><Heart size={19}/></button><button className="roundIcon" onClick={()=>share(detailPlace)}><Share2 size={19}/></button></div></div>
     <section className="detailSheet">
       <h1>{detailPlace.name}</h1><p className="subLine">{detailPlace.county}・{typeLabel(detailPlace)}</p>
       <div className="tagRow">{detailPlace.isFree&&<span className="softTag amber">免費</span>}{detailPlace.multiKidFriendly&&<span className="softTag green">親子友善</span>}<span className="softTag blue">{detailPlace.indoor?"室內":"戶外"}</span><span className="softTag coral">{priceLabel(detailPlace)}</span></div>
       <p className="description">依你目前設定條件篩選出的親子去處。實際開放、票價與設施仍以官方資料為準。</p>
       <div className="metricGrid"><div><Car/><b>車程</b><span>{detailPlace._driveMinutes?detailPlace._driveMinutes+" 分鐘":"依導航為準"}</span></div><div><Clock3/><b>建議停留</b><span>{detailPlace.durationMin?Math.round(detailPlace.durationMin/60)+"–3 小時":"約 2 小時"}</span></div><div><WalletCards/><b>費用</b><span>{priceLabel(detailPlace)}</span></div></div>
       <section className="detailBlock"><h2>適合年齡</h2><div className="ageDetailGrid">{AGES.map(a=><div key={a.id} className={(detailPlace.ageTags||[]).includes(a.id)?"ageMini on":"ageMini"}><Baby size={21}/><b>{a.label}</b></div>)}</div></section>
       <section className="detailBlock"><h2>設施與服務</h2><div className="facilityGrid"><div><ParkingCircle/><span>{detailPlace.amenities?.parking==="easy"?"好停車":"停車依現場"}</span></div><div><Baby/><span>{detailPlace.amenities?.stroller?"推車友善":"推車資訊待確認"}</span></div><div><Accessibility/><span>{detailPlace.amenities?.diaperStation?"有尿布台":"尿布台待確認"}</span></div><div><Utensils/><span>{detailPlace.amenities?.foodNearby?"附近有餐飲":"餐飲待確認"}</span></div></div></section>
       <section className="detailBlock"><h2>為什麼推薦給你？</h2><div className="reasonCard">{reason(detailPlace).split("・").map((r,i)=><div key={i}><span className="checkDot">✓</span>{r}</div>)}</div></section>
       <div className="trustStrip"><ShieldCheck size={18}/><span>{detailPlace.sourceLabel||"官方資料"}</span>{detailPlace.trustLayer?.lastVerifiedAt&&<span>驗證 {detailPlace.trustLayer.lastVerifiedAt}</span>}{detailPlace.trustLayer?.officialUrl&&<a href={detailPlace.trustLayer.officialUrl} target="_blank" rel="noreferrer">官方來源 <ExternalLink size={13}/></a>}</div>
       <div className="stickyActions"><button className="navPrimary" onClick={()=>map(detailPlace)}><Navigation size={19}/>導航去這裡</button><button className="shareSecondary" onClick={()=>share(detailPlace)}><Share2 size={18}/>傳給另一半</button></div>
     </section>
     {notice&&<div className="toast" onClick={()=>setNotice("")}>{notice}</div>}
   </main>
 }

 return <main className={result?"phoneShell resultMode":"phoneShell"}>
   <header className="appHeader"><div className="logoText">今天玩什麼<span>✦</span></div><button className="menuBtn"><Menu size={25}/></button></header>

   {!result ? <>
     <section className="introHero"><div className="heroCopy"><h1>不知道去哪？<br/><strong>今天玩什麼</strong><br/>幫你決定！</h1><p>輸入幾個條件，3 秒給你今天最適合的親子行程！</p></div><div className="heroArtwork"><HeroIllustration/></div></section>
     <section className="decisionPanel">
       <h2>孩子幾歲？ <span>（可複選）</span></h2>
       <div className="ageChoiceGrid">{AGES.map(a=><button key={a.id} className={ages.includes(a.id)?"choiceCard selected":"choiceCard"} onClick={()=>toggleAge(a.id)}><div className="kidBadge"><Baby size={22}/></div><div><b>{a.label}</b><small>{a.sub}</small></div></button>)}</div>
       <h2>想怎麼玩？ <span>（可複選）</span></h2>
       <div className="playGrid">
         {[["outdoor","戶外放電",TreePine],["indoor","室內玩樂",House],["free","免費景點",WalletCards],["auto","雨天備案",Umbrella]].map(([id,label,Icon])=><button key={id} className={prefs.includes(id)?"playCard selected":"playCard"} onClick={()=>togglePref(id)}><Icon size={24}/><b>{label}</b></button>)}
         <button className="playCard"><CalendarDays size={24}/><b>本週活動</b></button><button className="playCard"><Star size={24}/><b>期間限定</b></button>
       </div>
       <h2>何時出發？</h2>
       <div className="whenGrid">{[["now","現在",SunMedium],["afternoon","今天下午",Clock3],["tomorrow","明天",CalendarDays],["weekend","這週末",CalendarDays]].map(([id,label,Icon])=><button key={id} className={when===id?"miniChoice selected":"miniChoice"} onClick={()=>setWhen(id)}><Icon size={21}/><span>{label}</span></button>)}</div>
       <h2>出發地點</h2>
       <div className="locationRow"><button className="locationPrimary"><MapPin size={20}/>使用我的位置<small>{userCoords?"已取得大概位置":"未授權時使用縣市"}</small></button><select value={county} onChange={e=>setCounty(e.target.value)}>{COUNTIES.map(c=><option key={c}>{c}</option>)}</select></div>
       <h2>交通方式</h2>
       <div className="transportRow"><button className={transport==="drive"?"transportChoice selected":"transportChoice"} onClick={()=>setTransport("drive")}><Car size={22}/>開車</button><button className={transport==="transit"?"transportChoice selected":"transportChoice"} onClick={()=>setTransport("transit")}><Bus size={22}/>大眾運輸</button></div>
       <h2>最多願意開多久？ <span>（單程）</span></h2>
       <div className="driveRow">{[15,30,45,60].map(v=><button key={v} className={maxDrive===v?"driveChip selected":"driveChip"} onClick={()=>setMaxDrive(v)}>{v}分</button>)}</div>
       <button className="decideBtn" onClick={decide}><span className="spark">✦</span>幫我決定今天玩什麼 <span>→</span></button>
     </section>
   </> : <section className="resultScreen">
     <div className="weatherBanner"><MapPin size={19}/><div><b>{county}・{weather?"多雲時晴":"天氣讀取中"}</b><span>{weather?("降雨機率 "+weather.pop+"%・"+Math.round(weather.temp)+"°C"):"依選擇縣市自動判斷"}</span></div><SunMedium className="sunIcon"/></div>
     {!result.hero ? <div className="empty prettyEmpty"><div className="emptyArt"><Umbrella size={38}/></div><h3>這個條件目前沒有通過驗證的選擇</h3><p>{result.fallbackNote}</p><div className="emptyActions">{prefs.includes("indoor")&&<button onClick={()=>{setPrefs(["outdoor"]);setResult(null)}}>改看戶外</button>}{prefs.includes("free")&&<button onClick={()=>{setPrefs(v=>v.filter(x=>x!=="free"));setResult(null)}}>接受門票</button>}<button onClick={()=>setResult(null)}>重新調整</button></div>{preview.hero&&<button className="previewLink" onClick={()=>setResult({...preview,preview:true,fallbackNote:"尚未完成官方驗證，只供參考。"})}>看看尚未驗證的候選方向</button>}</div> : <>
       <div className="resultIntro"><div className="avatarMom"><Baby size={25}/></div><div><b>根據你選的條件</b><span>今天最適合的行程是…</span></div><Heart size={21}/></div>
       <article className="heroResultCard">
         <div className="heroImageWrap"><PlaceIllustration kind={result.hero.category}/><span className="crownBadge">{result.preview?"候選預覽":"首選推薦"}</span></div>
         <div className="heroResultBody">
           <h1 onClick={()=>showDetail(result.hero)}>{result.hero.name}</h1><p>{result.hero.county}・{typeLabel(result.hero)}</p>
           <div className="quickLine"><Car size={18}/>車程約 {result.hero._driveMinutes||"—"} 分鐘 <button onClick={()=>showDetail(result.hero)}><MapPin size={17}/>查看地圖</button></div>
           <div className="miniStats"><div><span>適合年齡</span><b>{ageText(result.hero)}</b></div><div><span>費用</span><b>{priceLabel(result.hero)}</b></div><div><span>建議停留</span><b>{result.hero.durationMin?Math.round(result.hero.durationMin/60)+"–3小時":"約2小時"}</b></div></div>
           <div className="ratingRow"><div><span>放電程度</span><b>{"★".repeat(Math.min(5,result.hero.energyLevel||3))}</b></div><div><span>爸媽輕鬆度</span><b>{"★".repeat(Math.max(2,5-(result.hero.parentEffort||2)))}</b></div></div>
           <div className="amenityLine">{result.hero.amenities?.parking==="easy"&&<span><ParkingCircle/>好停車</span>}{result.hero.amenities?.stroller&&<span><Baby/>推車友善</span>}{result.hero.amenities?.foodNearby&&<span><Utensils/>附近有美食</span>}{result.hero.amenities?.parking!=="easy"&&!result.hero.amenities?.stroller&&!result.hero.amenities?.foodNearby&&<span>設施資訊待驗證</span>}</div>
           <div className="whyBox"><h3>{result.preview?"為什麼先讓你參考？":"為什麼推薦給你？"}</h3>{(result.preview?"符合你目前選的縣市、年齡與玩法條件；但仍待官方逐筆驗證。":reason(result.hero)).split("・").slice(0,4).map((r,i)=><p key={i}><span>✓</span>{r}</p>)}</div>{result.preview&&<div className="previewWarning">候選資料僅供 Demo 參考，不代表已確認營業、精確位置或設施。</div>}
           <div className="mainActions"><button className="navPrimary" onClick={()=>map(result.hero)} disabled={result.preview||!result.hero.isCoordinatePrecise}><Navigation size={19}/>{result.preview?"座標待驗證":"導航去這裡"}</button><button className="shareSecondary" onClick={()=>share(result.hero)}><Share2 size={18}/>傳給另一半</button></div>
         </div>
       </article>
       <div className="altsHeader"><h2>另外兩個備選方案</h2><button onClick={reroll}><RotateCcw size={16}/>換一批推薦</button></div>
       <div className="altStack">{(result.alternatives||[]).map(p=><article className="altResultCard" key={p.id}><button className="altThumb" onClick={()=>showDetail(p)}><PlaceIllustration kind={p.category} compact/></button><div className="altContent"><h3 onClick={()=>showDetail(p)}>{p.name}</h3><p>{p.county}・{typeLabel(p)}</p><div className="altMeta"><span><Car/>約 {p._driveMinutes||"—"} 分</span><span>{priceLabel(p)}</span></div><div className="altTags"><span>{p.indoor?"室內":"戶外"}</span>{p.isFree&&<span>免費</span>}</div></div><div className="altButtons"><button onClick={()=>map(p)}><Navigation size={16}/>導航</button><button onClick={()=>share(p)}><Share2 size={15}/>分享</button></div></article>)}{(result.alternatives||[]).length<2&&<div className="emptyAlt">沒有更多安全備選，系統不會跨縣市硬補。</div>}</div>
       <button className="modifyBtn" onClick={()=>setResult(null)}>修改條件</button>
     </>}
   </section>}
   {notice&&<div className="toast" onClick={()=>setNotice("")}>{notice}</div>}
 </main>
}

createRoot(document.getElementById("root")).render(<App/>);
