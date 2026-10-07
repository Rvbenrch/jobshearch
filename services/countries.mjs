// Match published location labels only; a generic remote role has no inferred country.
const entries=[
 ['es','España',['Spain','España','Madrid','Barcelona','Valencia','Seville','Sevilla','Malaga']],
 ['gb','Reino Unido',['United Kingdom','UK','England','Scotland','London','Manchester','Edinburgh','Belfast']],
 ['us','Estados Unidos',['United States','USA','US','New York','San Francisco','Seattle','Chicago','Boston','Austin','Los Angeles','Atlanta','Denver','Washington DC']],
 ['de','Alemania',['Germany','Deutschland','Berlin','Munich','München','Frankfurt','Hamburg']],
 ['fr','Francia',['France','Paris','Lyon','Marseille']],
 ['ie','Irlanda',['Ireland','Dublin','Cork']],
 ['ca','Canadá',['Canada','Toronto','Vancouver','Montreal','Montréal','Ottawa']],
 ['pt','Portugal',['Portugal','Lisbon','Lisboa','Porto']],
 ['nl','Países Bajos',['Netherlands','Amsterdam','Rotterdam']],
 ['it','Italia',['Italy','Italia','Milan','Milano','Rome','Roma']],
 ['pl','Polonia',['Poland','Warsaw','Warszawa','Krakow','Kraków']],
 ['be','Bélgica',['Belgium','Brussels','Bruxelles']],
 ['ch','Suiza',['Switzerland','Zurich','Zürich','Geneva']],
 ['se','Suecia',['Sweden','Stockholm']],
 ['dk','Dinamarca',['Denmark','Copenhagen']],
 ['no','Noruega',['Norway','Oslo']],
 ['fi','Finlandia',['Finland','Helsinki']],
 ['at','Austria',['Austria','Vienna','Wien']],
 ['cz','Chequia',['Czech Republic','Czechia','Prague','Praha']],
 ['in','India',['India','Bengaluru','Bangalore','Mumbai','Hyderabad','New Delhi']],
 ['sg','Singapur',['Singapore','Singapur']],
 ['au','Australia',['Australia','Sydney','Melbourne','Brisbane']],
 ['nz','Nueva Zelanda',['New Zealand','Auckland','Wellington']],
 ['jp','Japón',['Japan','Tokyo','Osaka']],
 ['br','Brasil',['Brazil','Brasil','São Paulo','Sao Paulo']],
 ['mx','México',['Mexico','México','Mexico City','Ciudad de México']],
 ['ar','Argentina',['Argentina','Buenos Aires']],
 ['ae','Emiratos Árabes Unidos',['United Arab Emirates','UAE','Dubai','Abu Dhabi']]
];
export const countries=entries.map(([code,name])=>({code,name}));
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function matchesCountry(job,code){
 if(!code)return true;
 if(job.provider==='adzuna')return job.sourceBoard===code;
 const entry=entries.find(([key])=>key===code);if(!entry)return false;
 const location=normalize(job.location);
 return entry[2].some(alias=>new RegExp('(^|[^a-z])'+normalize(alias)+'([^a-z]|$)').test(location));
}
