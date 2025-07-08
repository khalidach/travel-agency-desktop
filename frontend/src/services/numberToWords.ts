// frontend/src/services/numberToWords.ts

function toWords(num: number): string {
  const units = [
    "",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
  ];
  const teens = [
    "dix",
    "onze",
    "douze",
    "treize",
    "quatorze",
    "quinze",
    "seize",
    "dix-sept",
    "dix-huit",
    "dix-neuf",
  ];
  const tens = [
    "",
    "dix",
    "vingt",
    "trente",
    "quarante",
    "cinquante",
    "soixante",
    "soixante-dix",
    "quatre-vingt",
    "quatre-vingt-dix",
  ];

  if (num === 0) return "zéro";

  let words = "";

  if (Math.floor(num / 1000000) > 0) {
    const millions = Math.floor(num / 1000000);
    words +=
      (millions > 1 ? toWords(millions) : "") +
      (millions > 1 ? " millions " : " un million ");
    num %= 1000000;
  }

  if (Math.floor(num / 1000) > 0) {
    const thousands = Math.floor(num / 1000);
    if (thousands > 1) {
      words += toWords(thousands) + " mille ";
    } else {
      words += "mille ";
    }
    num %= 1000;
  }

  if (Math.floor(num / 100) > 0) {
    const hundreds = Math.floor(num / 100);
    if (hundreds > 1) {
      words += toWords(hundreds) + " cent ";
    } else {
      words += "cent ";
    }
    if (num % 100 === 0 && hundreds > 1) {
      words = words.trim() + "s ";
    }
    num %= 100;
  }

  if (num > 0) {
    if (words !== "") {
      words += "";
    }

    if (num < 10) {
      words += units[num];
    } else if (num < 20) {
      words += teens[num - 10];
    } else {
      const ten = Math.floor(num / 10);
      const unit = num % 10;
      words += tens[ten];
      if (ten === 8 && unit === 0) {
        words += "s";
      }
      if (unit > 0) {
        if (ten === 7 || ten === 9) {
          words = words.slice(0, -3) + teens[unit];
        } else {
          words += (unit === 1 && ten !== 8 ? " et " : "-") + units[unit];
        }
      }
    }
  }

  return words.trim();
}

export function numberToWordsFr(num: number | string): string {
  const numericValue = typeof num === "string" ? parseFloat(num) : num;

  if (typeof numericValue !== "number" || isNaN(numericValue)) {
    return "Invalid number";
  }

  const integerPart = Math.floor(numericValue);
  const decimalPart = Math.round((numericValue - integerPart) * 100);

  let result = toWords(integerPart) + " dirhams";

  if (decimalPart > 0) {
    result += " et " + toWords(decimalPart) + " centimes";
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
}
