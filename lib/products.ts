export const PRODUCTS = [
  { id: 1, name: "Linen Overshirt", price: 89, emoji: "👔", cat: "Apparel" },
  { id: 2, name: "Trail Runner 3", price: 129, emoji: "👟", cat: "Footwear" },
  { id: 3, name: "Ceramic Pour-over", price: 42, emoji: "☕", cat: "Home" },
  { id: 4, name: "Canvas Weekender", price: 156, emoji: "🧳", cat: "Bags" },
  { id: 5, name: "Mechanical Keyboard", price: 174, emoji: "⌨️", cat: "Tech" },
  { id: 6, name: "Noise-cancel Buds", price: 119, emoji: "🎧", cat: "Tech" },
  { id: 7, name: "Merino Beanie", price: 34, emoji: "🧢", cat: "Apparel" },
  { id: 8, name: "Brass Desk Lamp", price: 98, emoji: "💡", cat: "Home" },
];
export type Product = (typeof PRODUCTS)[number];
