// Страница товара: цена в долларах и евро по курсу ЦБ.

const product = document.querySelector(".product");
renderCurrency(document.getElementById("currency-box"), Number(product.dataset.price));
