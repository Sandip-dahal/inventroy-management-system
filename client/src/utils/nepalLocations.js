const nepalLocations = {
  provinces: {
    '1': {
      name: 'Province 1',
      districts: {
        'Bhojpur': ['Bhojpur Municipality', 'Shadananda Municipality', 'Hatuwagadhi Rural Municipality', 'Ramprasad Rai Rural Municipality', 'Aamchowk Rural Municipality', 'Tyamke Maiyum Rural Municipality', 'Pauwadungma Rural Municipality', 'Salpasilichho Rural Municipality'],
        'Dhankuta': ['Dhankuta Municipality', 'Pakhribas Municipality', 'Mahalaxmi Municipality', 'Sangurigadhi Rural Municipality', 'Chhathar Jorpati Rural Municipality', 'Chaubise Rural Municipality'],
        'Ilam': ['Ilam Municipality', 'Deumai Municipality', 'Mai Municipality', 'Suryodaya Municipality', 'Phakphokthum Rural Municipality', 'Mai Jogmai Rural Municipality', 'Chulachuli Rural Municipality', 'Rong Rural Municipality', 'Mangsebung Rural Municipality'],
        'Jhapa': ['Bhadrapur Municipality', 'Birtamod Municipality', 'Arjundhara Municipality', 'Gauradaha Municipality', 'Damak Municipality', 'Kankai Municipality', 'Mechinagar Municipality', 'Shivasatakshi Municipality', 'Buddhashanti Rural Municipality', 'Kachankawal Rural Municipality', 'Kamal Rural Municipality', 'Gauriganj Rural Municipality', 'Barhadashi Rural Municipality', 'Jhapa Rural Municipality', 'Haldibari Rural Municipality'],
        'Khotang': ['Diktel Rupakot Majhuwagadhi Municipality', 'Halesi Tuwachung Municipality', 'Rupakot Majhuwagadhi Municipality', 'Ainselukhark Rural Municipality', 'Rawabesi Rural Municipality', 'Sakela Rural Municipality', 'Khotehang Rural Municipality', 'Kepilasagadhi Rural Municipality', 'Jantedhunga Rural Municipality', 'Barahapokhari Rural Municipality'],
        'Morang': ['Biratnagar Metropolitan City', 'Sundar Haraicha Municipality', 'Belbari Municipality', 'Pathari-Sanischare Municipality', 'Rangeli Municipality', 'Urlabari Municipality', 'Letang Municipality', 'Sunbarshi Municipality', 'Dhanpalthan Rural Municipality', 'Kanepokhari Rural Municipality', 'Budhiganga Rural Municipality', 'Gramthan Rural Municipality', 'Jahada Rural Municipality', 'Katahari Rural Municipality', 'Kerabari Rural Municipality', 'Miklajung Rural Municipality', 'Patahrishishwa Rural Municipality'],
        'Okhaldhunga': ['Siddhicharan Municipality', 'Manebhanjyang Rural Municipality', 'Champadevi Rural Municipality', 'Sunkoshi Rural Municipality', 'Molung Rural Municipality', 'Chisankhugadhi Rural Municipality', 'Khijidemba Rural Municipality'],
        'Panchthar': ['Phidim Municipality', 'Hilihang Rural Municipality', 'Kummayak Rural Municipality', 'Miklajung Rural Municipality', 'Tumbewa Rural Municipality', 'Yangwarak Rural Municipality', 'Falelung Rural Municipality', 'Falgunanda Rural Municipality'],
        'Sankhuwasabha': ['Khandbari Municipality', 'Chainpur Municipality', 'Dharmadevi Municipality', 'Madi Municipality', 'Panchkhapan Municipality', 'Bhotkhola Rural Municipality', 'Chichila Rural Municipality', 'Makalu Rural Municipality', 'Sabhapokhari Rural Municipality', 'Siliyang Rural Municipality'],
        'Solukhumbu': ['Solu Dudhkunda Municipality', 'Thulung Dudhkoshi Rural Municipality', 'Necha Salyan Rural Municipality', 'Maha Kulung Rural Municipality', 'Sotang Rural Municipality', 'Khumbu Pasang Lhamu Rural Municipality', 'Likhu Pike Rural Municipality'],
        'Sunsari': ['Inaruwa Municipality', 'Itahari Sub-Metropolitan City', 'Duhabi Municipality', 'Dharan Sub-Metropolitan City', 'Ramdhuni Municipality', 'Barahachhetra Municipality', 'Gadhi Rural Municipality', 'Koshi Rural Municipality', 'Harinagar Rural Municipality', 'Bhokraha Narsingh Rural Municipality', 'Dewanganj Rural Municipality'],
        'Taplejung': ['Phungling Municipality', 'Aathrai Tribeni Rural Municipality', 'Sidingwa Rural Municipality', 'Phaktanglung Rural Municipality', 'Mikkwakhola Rural Municipality', 'Meringden Rural Municipality', 'Maiwakhola Rural Municipality', 'Yangwarak Rural Municipality', 'Sirijangha Rural Municipality'],
        'Terhathum': ['Myanglung Municipality', 'Laligurans Municipality', 'Aathrai Rural Municipality', 'Chhathar Rural Municipality', 'Phedap Rural Municipality', 'Menchayem Rural Municipality'],
        'Udayapur': ['Triyuga Municipality', 'Katari Municipality', 'Chaudandigadhi Municipality', 'Belaka Municipality', 'Udayapurgadhi Rural Municipality', 'Rautamai Rural Municipality', 'Tapli Rural Municipality', 'Limchungbung Rural Municipality']
      }
    },
    '2': {
      name: 'Province 2',
      districts: {
        'Bara': ['Kalaiya Sub-Metropolitan City', 'Jitpur Simara Sub-Metropolitan City', 'Mahagadhimai Municipality', 'Simraungadh Municipality', 'Pacharauta Municipality', 'Adarsh Kotwal Rural Municipality', 'Karaiyamai Rural Municipality', 'Pheta Rural Municipality', 'Prasauni Rural Municipality', 'Bishrampur Rural Municipality', 'Suwarna Rural Municipality', 'Baragadhi Rural Municipality', 'Devtal Rural Municipality', 'Kolhabi Municipality', 'Nijgadh Municipality'],
        'Parsa': ['Birgunj Metropolitan City', 'Bahudaramai Municipality', 'Pokhariya Municipality', 'Parsagadhi Municipality', 'Jagarnathpur Rural Municipality', 'Chhipaharmai Rural Municipality', 'Dhobini Rural Municipality', 'Pakahamainpur Rural Municipality', 'SakhuwaPrasauni Rural Municipality', 'Thori Rural Municipality', 'Jirabhawani Rural Municipality'],
        'Rautahat': ['Gaur Municipality', 'Chandrapur Municipality', 'Garuda Municipality', 'Baudhimai Municipality', 'Rajpur Farhadawa Municipality', 'Rajdevi Municipality', 'Gadhimai Municipality', 'Brindaban Municipality', 'Ishanath Municipality', 'Katahariya Municipality', 'Madhav Narayan Municipality', 'Maulapur Municipality', 'Dewahi Gonahi Municipality', 'Durga Bhagwati Rural Municipality', 'Phatuwa Bijayapur Rural Municipality', 'Yemunamai Rural Municipality', 'Gujara Municipality'],
        'Saptari': ['Rajbiraj Municipality', 'Hanumannagar Kankalini Municipality', 'Khadak Municipality', 'Dakneshwari Municipality', 'Surunga Municipality', 'Bodebarsain Municipality', 'Shambhunath Municipality', 'Kanchanrup Municipality', 'Saptakoshi Municipality', 'Agnisair Krishna Savaran Rural Municipality', 'Rupani Rural Municipality', 'Bishnupur Rural Municipality', 'Belhi Chapena Rural Municipality', 'Tirahut Rural Municipality', 'Tilathi Koiladi Rural Municipality', 'Mahadeva Rural Municipality', 'Chhinnamasta Rural Municipality'],
        'Siraha': ['Lahan Municipality', 'Siraha Municipality', 'Dhangadhimai Municipality', 'Mirchaiya Municipality', 'Golbazar Municipality', 'Kalyanpur Municipality', 'Karjanha Municipality', 'Sukhipur Municipality', 'Bhagwanpur Rural Municipality', 'Aurahi Rural Municipality', 'Bariyarpatti Rural Municipality', 'Laxmipur Patari Rural Municipality', 'Naraha Rural Municipality', 'Sakhuwanankarkatti Rural Municipality', 'Arnama Rural Municipality', 'Bishnupur Rural Municipality']
      }
    },
    '3': {
      name: 'Bagmati Province',
      districts: {
        'Bhaktapur': ['Bhaktapur Municipality', 'Changunarayan Municipality', 'Suryabinayak Municipality', 'Madhyapur Thimi Municipality'],
        'Chitwan': ['Bharatpur Metropolitan City', 'Ratnanagar Municipality', 'Rapti Municipality', 'Kalika Municipality', 'Khairahani Municipality', 'Madi Municipality', 'Ichhyakamana Rural Municipality'],
        'Dhading': ['Dhunibesi Municipality', 'Nilkantha Municipality', 'Khaniyabas Rural Municipality', 'Gajuri Rural Municipality', 'Galchi Rural Municipality', 'Gangajamuna Rural Municipality', 'Jwalamukhi Rural Municipality', 'Thakre Rural Municipality', 'Netrawati Rural Municipality', 'Rubi Valley Rural Municipality', 'Siddhalek Rural Municipality', 'Tripurasundari Rural Municipality'],
        'Dolakha': ['Bhimeshwor Municipality', 'Jiri Municipality', 'Kalinchok Rural Municipality', 'Melung Rural Municipality', 'Bigu Rural Municipality', 'Gaurishankar Rural Municipality', 'Baiteshwor Rural Municipality', 'Shailung Rural Municipality'],
        'Kathmandu': ['Kathmandu Metropolitan City', 'Lalitpur Metropolitan City', 'Bhaktapur Municipality', 'Kirtipur Municipality', 'Madhyapur Thimi Municipality', 'Shankharapur Municipality', 'Tarakeshwor Municipality', 'Tokha Municipality', 'Chandragiri Municipality', 'Dakshinkali Municipality', 'Nagarkot Municipality', 'Kageshwori Manohara Municipality'],
        'Kavrepalanchok': ['Dhulikhel Municipality', 'Banepa Municipality', 'Panauti Municipality', 'Panchkhal Municipality', 'Namobuddha Municipality', 'Mandan Deupur Municipality', 'Khanikhola Rural Municipality', 'Chaurideurali Rural Municipality', 'Temal Rural Municipality', 'Bethanchok Rural Municipality', 'Bhumlu Rural Municipality', 'Mahabharat Rural Municipality', 'Roshi Rural Municipality'],
        'Lalitpur': ['Lalitpur Metropolitan City', 'Mahalaxmi Municipality', 'Godawari Municipality', 'Konjyosom Rural Municipality', 'Bagmati Rural Municipality', 'Mahankal Rural Municipality'],
        'Makwanpur': ['Hetauda Sub-Metropolitan City', 'Thaha Municipality', 'Bhimphedi Rural Municipality', 'Makwanpurgadhi Rural Municipality', 'Manahari Rural Municipality', 'Raksirang Rural Municipality', 'Bakaiya Rural Municipality', 'Kailash Rural Municipality', 'Bagmati Rural Municipality', 'Indrasarowar Rural Municipality'],
        'Nuwakot': ['Bidur Municipality', 'Belkotgadhi Municipality', 'Kakani Rural Municipality', 'Kispang Rural Municipality', 'Tadi Rural Municipality', 'Dupcheshwor Rural Municipality', 'Panchakanya Rural Municipality', 'Likhu Rural Municipality', 'Myagang Rural Municipality', 'Suryagadhi Rural Municipality', 'Tarkeshwor Rural Municipality'],
        'Ramechhap': ['Manthali Municipality', 'Ramechhap Municipality', 'Umakunda Rural Municipality', 'Khadadevi Rural Municipality', 'Gokulganga Rural Municipality', 'Doramba Rural Municipality', 'Sunapati Rural Municipality'],
        'Rasuwa': ['Dhunche Municipality', 'Gosaikunda Rural Municipality', 'Naukunda Rural Municipality', 'Kalika Rural Municipality', 'Uttargaya Rural Municipality'],
        'Sindhuli': ['Kamalamai Municipality', 'Dudhauli Municipality', 'Tinpatan Rural Municipality', 'Marin Rural Municipality', 'Hariharpurgadhi Rural Municipality', 'Sunkoshi Rural Municipality', 'Golanjor Rural Municipality', 'Phikkal Rural Municipality', 'Ghyanglekh Rural Municipality'],
        'Sindhupalchok': ['Chautara Sangachokgadhi Municipality', 'Barhabise Municipality', 'Melamchi Municipality', 'Bhotekoshi Rural Municipality', 'Balephi Rural Municipality', 'Lisankhu Pakhar Rural Municipality', 'Sunkoshi Rural Municipality', 'Helambu Rural Municipality', 'Indrawati Rural Municipality', 'Jugal Rural Municipality', 'Panchpokhari Thangpal Rural Municipality']
      }
    },
    '4': {
      name: 'Gandaki Province',
      districts: {
        'Baglung': ['Baglung Municipality', 'Galkot Municipality', 'Jaimuni Municipality', 'Dhorpatan Municipality', 'Bareng Rural Municipality', 'Khathekhola Rural Municipality', 'Taman Khola Rural Municipality', 'Tara Khola Rural Municipality', 'Nisikhola Rural Municipality', 'Badigad Rural Municipality'],
        'Gorkha': ['Gorkha Municipality', 'Palungtar Municipality', 'Sulikot Rural Municipality', 'Siranchok Rural Municipality', 'Ajirkot Rural Municipality', 'Arughat Rural Municipality', 'Gandaki Rural Municipality', 'Bhimsen Thapa Rural Municipality', 'Dharche Rural Municipality', 'Sahid Lakhan Rural Municipality'],
        'Kaski': ['Pokhara Metropolitan City', 'Annapurna Rural Municipality', 'Machhapuchhre Rural Municipality', 'Madi Rural Municipality', 'Rupa Rural Municipality'],
        'Lamjung': ['Besisahar Municipality', 'Sundarbazar Municipality', 'Madhya Nepal Municipality', 'Rainas Municipality', 'Dordi Rural Municipality', 'Dudhpokhari Rural Municipality', 'Kwolasothar Rural Municipality', 'Marsyangdi Rural Municipality'],
        'Manang': ['Chame Rural Municipality', 'Narphu Rural Municipality', 'Nashong Rural Municipality', 'Manang Ingshyang Rural Municipality'],
        'Mustang': ['Gharpajhong Rural Municipality', 'Thasang Rural Municipality', 'Lomanthang Rural Municipality', 'Varagung Muktichhetra Rural Municipality', 'Lo-Ghekar Damodarkunda Rural Municipality'],
        'Myagdi': ['Beni Municipality', 'Annapurna Rural Municipality', 'Dhaulagiri Rural Municipality', 'Mangala Rural Municipality', 'Malika Rural Municipality', 'Raghuganga Rural Municipality'],
        'Nawalpur': ['Kawasoti Municipality', 'Gaindakot Municipality', 'Madhyabindu Municipality', 'Devchuli Municipality', 'Baudikali Rural Municipality', 'Bulingtar Rural Municipality', 'Hupsekot Rural Municipality', 'Binayi Triveni Rural Municipality'],
        'Parbat': ['Kusma Municipality', 'Phalewas Municipality', 'Jaljala Rural Municipality', 'Paiyun Rural Municipality', 'Mahashila Rural Municipality', 'Modi Rural Municipality', 'Bihadi Rural Municipality'],
        'Syangja': ['Putalibazar Municipality', 'Bhirkot Municipality', 'Waling Municipality', 'Galyang Municipality', 'Chapakot Municipality', 'Arjunchaupari Rural Municipality', 'Aandhikhola Rural Municipality', 'Kaligandaki Rural Municipality', 'Phedikhola Rural Municipality', 'Harinas Rural Municipality'],
        'Tanahu': ['Damauli Municipality', 'Shuklagandaki Municipality', 'Bhanu Municipality', 'Bhimad Municipality', 'Byas Municipality', 'Devghat Rural Municipality', 'Bandipur Rural Municipality', 'Ghiring Rural Municipality', 'Myagde Rural Municipality', 'Rishing Rural Municipality', 'Anbukhaireni Rural Municipality']
      }
    },
    '5': {
      name: 'Lumbini Province',
      districts: {
        'Arghakhanchi': ['Sandhikharka Municipality', 'Sitganga Municipality', 'Bhumikasthan Municipality', 'Chhatradev Rural Municipality', 'Panini Rural Municipality'],
        'Banke': ['Nepalgunj Sub-Metropolitan City', 'Kohalpur Municipality', 'Narainapur Rural Municipality', 'Rapti Sonari Rural Municipality', 'Baijanath Rural Municipality', 'Khajura Rural Municipality', 'Duduwa Rural Municipality'],
        'Bardiya': ['Gulariya Municipality', 'Rajapur Municipality', 'Madhuwan Municipality', 'Thakurbaba Municipality', 'Barbardiya Municipality', 'Bansgadhi Municipality', 'Geruwa Rural Municipality', 'Badhaiyatal Rural Municipality'],
        'Dang': ['Ghorahi Sub-Metropolitan City', 'Tulsipur Sub-Metropolitan City', 'Lamahi Municipality', 'Bangalachuli Rural Municipality', 'Dangisharan Rural Municipality', 'Rapti Rural Municipality', 'Gadhawa Rural Municipality', 'Rajpur Rural Municipality', 'Babhani Rural Municipality', 'Shantinagar Rural Municipality'],
        'Gulmi': ['Tamghas Municipality', 'Resunga Municipality', 'Musikot Municipality', 'Kaligandaki Rural Municipality', 'Gulmi Darbar Rural Municipality', 'Madane Rural Municipality', 'Chandrakot Rural Municipality', 'Malika Rural Municipality', 'Chatrakot Rural Municipality', 'Isma Rural Municipality', 'Ruru Rural Municipality', 'Satyawati Rural Municipality', 'Dhurkot Rural Municipality'],
        'Kapilbastu': ['Kapilbastu Municipality', 'Banganga Municipality', 'Buddhabhumi Municipality', 'Shivaraj Municipality', 'Maharajgunj Municipality', 'Krishnanagar Municipality', 'Yashodhara Rural Municipality', 'Bijayanagar Rural Municipality', 'Mayadevi Rural Municipality', 'Suddhodhan Rural Municipality'],
        'Parasi': ['Ramgram Municipality', 'Bardghat Municipality', 'Sunwal Municipality', 'Susta Rural Municipality', 'Palhi Nandan Rural Municipality', 'Pratappur Rural Municipality', 'Sarawal Rural Municipality'],
        'Palpa': ['Tansen Municipality', 'Rampur Municipality', 'Rainadevi Chhahara Rural Municipality', 'Mathagadhi Rural Municipality', 'Nisdi Rural Municipality', 'Bagnaskali Rural Municipality', 'Rambha Rural Municipality', 'Purbakhola Rural Municipality', 'Tinau Rural Municipality', 'Ribdikot Rural Municipality'],
        'Pyuthan': ['Pyuthan Municipality', 'Sworgadwary Municipality', 'Mallarani Rural Municipality', 'Mandavi Rural Municipality', 'Sarumarani Rural Municipality', 'Naubahini Rural Municipality', 'Jhimruk Rural Municipality', 'Gaumukhi Rural Municipality'],
        'Rolpa': ['Liwang Municipality', 'Runtigadhi Rural Municipality', 'Rolpa Municipality', 'Triveni Rural Municipality', 'Sunil Smriti Rural Municipality', 'Sunchhahari Rural Municipality', 'Madi Rural Municipality', 'Ganga Devi Rural Municipality', 'Thawang Rural Municipality', 'Pariwartan Rural Municipality'],
        'Rukum East': ['Rukumkot Municipality', 'Bhume Rural Municipality', 'Putha Uttarganga Rural Municipality', 'Sisne Rural Municipality'],
        'Rupandehi': ['Butwal Sub-Metropolitan City', 'Siddharthanagar Municipality', 'Lumbini Sanskritik Municipality', 'Tilottama Municipality', 'Gaidahawa Rural Municipality', 'Kanchan Rural Municipality', 'Kotahimai Rural Municipality', 'Marchawari Rural Municipality', 'Mayadevi Rural Municipality', 'Omsatiya Rural Municipality', 'Rohini Rural Municipality', 'Sammarimai Rural Municipality', 'Suddhodhan Rural Municipality', 'Siyari Rural Municipality', 'Devdaha Municipality']
      }
    },
    '6': {
      name: 'Karnali Province',
      districts: {
        'Dailekh': ['Narayan Municipality', 'Dullu Municipality', 'Aathabis Municipality', 'Chamunda Bindrasaini Municipality', 'Gurans Rural Municipality', 'Bhairabi Rural Municipality', 'Naumule Rural Municipality', 'Mahabu Rural Municipality', 'Dungeshwor Rural Municipality', 'Thantikandh Rural Municipality'],
        'Dolpa': ['Thuli Bheri Municipality', 'Tripurasundari Municipality', 'Shey Phoksundo Rural Municipality', 'Jagadulla Rural Municipality', 'Dolpo Buddha Rural Municipality', 'Mudkechula Rural Municipality', 'Kaike Rural Municipality', 'Chharka Tangsong Rural Municipality'],
        'Humla': ['Simkot Rural Municipality', 'Namkha Rural Municipality', 'Kharpunath Rural Municipality', 'Sarkegad Rural Municipality', 'Adanchuli Rural Municipality', 'Chankheli Rural Municipality', 'Tajakot Rural Municipality'],
        'Jajarkot': ['Bheri Municipality', 'Chhedagad Municipality', 'Nalagad Municipality', 'Barekot Rural Municipality', 'Kuse Rural Municipality', 'Shiwalaya Rural Municipality'],
        'Jumla': ['Chandannath Municipality', 'Tila Rural Municipality', 'Kankasundari Rural Municipality', 'Sinja Rural Municipality', 'Hima Rural Municipality', 'Tatopani Rural Municipality', 'Patarasi Rural Municipality'],
        'Kalikot': ['Khandachakra Municipality', 'Raskot Municipality', 'Tilagufa Municipality', 'Pachaljharana Rural Municipality', 'Sanni Triveni Rural Municipality', 'Narharinath Rural Municipality', 'Mahawai Rural Municipality', 'Palata Rural Municipality'],
        'Mugu': ['Chhayanath Rara Municipality', 'Mugum Karmarong Rural Municipality', 'Soru Rural Municipality', 'Khatyad Rural Municipality'],
        'Rukum West': ['Musikot Municipality', 'Triveni Rural Municipality', 'Sani Bheri Rural Municipality', 'Aathbiskot Municipality', 'Chaurjahari Municipality', 'Banfikot Rural Municipality'],
        'Salyan': ['Shaarda Municipality', 'Bagchaur Municipality', 'Bangad Kupinde Municipality', 'Kalimati Rural Municipality', 'Triveni Rural Municipality', 'Kapurkot Rural Municipality', 'Kumakh Rural Municipality', 'Chhatreshwori Rural Municipality', 'Siddha Kumakh Rural Municipality'],
        'Surkhet': ['Birendranagar Municipality', 'Bheriganga Municipality', 'Gurbhakot Municipality', 'Panchapuri Municipality', 'Lekbeshi Municipality', 'Chaukune Rural Municipality', 'Barahatal Rural Municipality', 'Chingad Rural Municipality', 'Simta Rural Municipality']
      }
    },
    '7': {
      name: 'Sudurpashchim Province',
      districts: {
        'Achham': ['Mangalsen Municipality', 'Sanphebagar Municipality', 'Panchadewal Binayak Municipality', 'Kamal Bazar Municipality', 'Chaurpati Rural Municipality', 'Turmakhad Rural Municipality', 'Ramaroshan Rural Municipality', 'Bannigadhi Jayagadh Rural Municipality', 'Mellekh Rural Municipality', 'Dhakari Rural Municipality'],
        'Baitadi': ['Dasharathchand Municipality', 'Patan Municipality', 'Melauli Municipality', 'Purchaudi Municipality', 'Sigas Rural Municipality', 'Shivanath Rural Municipality', 'Pancheshwar Rural Municipality', 'Dogdakedar Rural Municipality', 'Dilasaini Rural Municipality', 'Surnaya Rural Municipality'],
        'Bajhang': ['Jayaprithvi Municipality', 'Bungal Municipality', 'Talkot Rural Municipality', 'Masta Rural Municipality', 'Khaptadchhanna Rural Municipality', 'Thalara Rural Municipality', 'Bitthadchir Rural Municipality', 'Surma Rural Municipality', 'Chhabis Pathibhera Rural Municipality', 'Durgathali Rural Municipality', 'Kedarseu Rural Municipality'],
        'Bajura': ['Badimalika Municipality', 'Tribeni Municipality', 'Budhiganga Municipality', 'Budhinanda Municipality', 'Gaumul Rural Municipality', 'Jagannath Rural Municipality', 'Swami Kartik Rural Municipality', 'Himali Rural Municipality'],
        'Dadeldhura': ['Amargadhi Municipality', 'Parshuram Municipality', 'Aalital Rural Municipality', 'Bhageshwar Rural Municipality', 'Navadurga Rural Municipality', 'Ajaymeru Rural Municipality'],
        'Darchula': ['Mahakali Municipality', 'Shailyashikhar Municipality', 'Malikaarjun Rural Municipality', 'Lekam Rural Municipality', 'Naugadh Rural Municipality', 'Duhun Rural Municipality', 'Marma Rural Municipality', 'Apihimal Rural Municipality'],
        'Doti': ['Dipayal Silgadhi Municipality', 'Shikhar Municipality', 'Purbichauki Rural Municipality', 'Badikedar Rural Municipality', 'Jorayal Rural Municipality', 'Sayal Rural Municipality', 'Aadarsha Rural Municipality', 'K I Singh Rural Municipality', 'Bogtan Foodsil Rural Municipality'],
        'Kailali': ['Dhangadhi Sub-Metropolitan City', 'Tikapur Municipality', 'Ghodaghodi Municipality', 'Lamki Chuha Municipality', 'Bhajani Municipality', 'Godawari Municipality', 'Gauriganga Municipality', 'Janaki Rural Municipality', 'Bardagoriya Rural Municipality', 'Mohanyal Rural Municipality', 'Kailari Rural Municipality', 'Joshipur Rural Municipality', 'Chure Rural Municipality'],
        'Kanchanpur': ['Bhimdatta Municipality', 'Punarbas Municipality', 'Bedkot Municipality', 'Krishnapur Municipality', 'Shuklaphanta Municipality', 'Belauri Municipality', 'Laljhandi Rural Municipality', 'Beldandi Rural Municipality', 'Mahakali Municipality']
      }
    }
  }
};

// Utility functions for accessing the data
function getAllProvinces() {
  return Object.values(nepalLocations.provinces).map(province => ({
    id: Object.keys(nepalLocations.provinces).find(key => nepalLocations.provinces[key] === province),
    name: province.name
  }));
}

function getDistrictsByProvince(provinceId) {
  const province = nepalLocations.provinces[provinceId];
  if (!province) return [];
  
  return Object.keys(province.districts).map(districtName => ({
    name: districtName,
    municipalities: province.districts[districtName]
  }));
}

function getMunicipalitiesByDistrict(provinceId, districtName) {
  const province = nepalLocations.provinces[provinceId];
  if (!province || !province.districts[districtName]) return [];
  
  return province.districts[districtName];
}

function searchLocation(query) {
  const results = {
    provinces: [],
    districts: [],
    municipalities: []
  };
  
  const lowercaseQuery = query.toLowerCase();
  
  // Search provinces
  Object.entries(nepalLocations.provinces).forEach(([id, province]) => {
    if (province.name.toLowerCase().includes(lowercaseQuery)) {
      results.provinces.push({ id, name: province.name });
    }
  });
  
  // Search districts and municipalities
  Object.entries(nepalLocations.provinces).forEach(([provinceId, province]) => {
    Object.entries(province.districts).forEach(([districtName, municipalities]) => {
      if (districtName.toLowerCase().includes(lowercaseQuery)) {
        results.districts.push({
          name: districtName,
          province: province.name,
          provinceId
        });
      }
      
      municipalities.forEach(municipality => {
        if (municipality.toLowerCase().includes(lowercaseQuery)) {
          results.municipalities.push({
            name: municipality,
            district: districtName,
            province: province.name,
            provinceId
          });
        }
      });
    });
  });
  
  return results;
}

module.exports = {
  nepalLocations,
  getAllProvinces,
  getDistrictsByProvince,
  getMunicipalitiesByDistrict,
  searchLocation
};