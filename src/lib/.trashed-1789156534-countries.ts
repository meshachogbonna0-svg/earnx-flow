/** Country + state/province data used by the registration and survey forms. */
export type Country = { name: string; code: string; dial: string; states: string[] };

export const COUNTRIES: Country[] = [
  {
    name: "Nigeria",
    code: "NG",
    dial: "+234",
    states: [
      "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT - Abuja","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara",
    ],
  },
  {
    name: "Ghana",
    code: "GH",
    dial: "+233",
    states: ["Ahafo","Ashanti","Bono","Bono East","Central","Eastern","Greater Accra","North East","Northern","Oti","Savannah","Upper East","Upper West","Volta","Western","Western North"],
  },
  {
    name: "Kenya",
    code: "KE",
    dial: "+254",
    states: ["Nairobi","Mombasa","Kisumu","Nakuru","Uasin Gishu","Kiambu","Machakos","Kilifi","Meru","Nyeri","Kakamega","Bungoma"],
  },
  {
    name: "South Africa",
    code: "ZA",
    dial: "+27",
    states: ["Eastern Cape","Free State","Gauteng","KwaZulu-Natal","Limpopo","Mpumalanga","North West","Northern Cape","Western Cape"],
  },
  {
    name: "Cameroon",
    code: "CM",
    dial: "+237",
    states: ["Adamawa","Centre","East","Far North","Littoral","North","North-West","South","South-West","West"],
  },
  {
    name: "Uganda",
    code: "UG",
    dial: "+256",
    states: ["Central","Eastern","Northern","Western"],
  },
  {
    name: "Tanzania",
    code: "TZ",
    dial: "+255",
    states: ["Arusha","Dar es Salaam","Dodoma","Mbeya","Morogoro","Mwanza","Tanga","Zanzibar"],
  },
  {
    name: "United Kingdom",
    code: "GB",
    dial: "+44",
    states: ["England","Northern Ireland","Scotland","Wales"],
  },
  {
    name: "United States",
    code: "US",
    dial: "+1",
    states: ["Alabama","Alaska","Arizona","California","Colorado","Florida","Georgia","Illinois","Maryland","Massachusetts","Michigan","New Jersey","New York","North Carolina","Ohio","Pennsylvania","Texas","Virginia","Washington"],
  },
  {
    name: "Canada",
    code: "CA",
    dial: "+1",
    states: ["Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland and Labrador","Nova Scotia","Ontario","Quebec","Saskatchewan"],
  },
];

export function statesFor(countryName: string): string[] {
  return COUNTRIES.find((c) => c.name === countryName)?.states ?? [];
}
