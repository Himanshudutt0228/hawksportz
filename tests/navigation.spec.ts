import {test,expect} from "@playwright/test";

test("new collections and sleeve/hoodie styles work on touch and keyboard",async({page})=>{
  await page.goto("/");
  const nav=page.getByRole("navigation",{name:"Main navigation"});
  for(const name of ["Clothing","Sports","Accessories"]) await expect(nav.getByRole("button",{name,exact:true})).toHaveCount(0);
  for(const [menu,label,title] of [["T-Shirts","Short Sleeve","Short Sleeve T-Shirts"],["T-Shirts","Long Sleeve","Long Sleeve T-Shirts"],["Hoodies","Pullover","Pullover Hoodies"],["Hoodies","Zip-Up","Zip-Up Hoodies"],["Jerseys","Short Sleeve","Short Sleeve Jerseys"],["Jerseys","Long Sleeve","Long Sleeve Jerseys"]]){
    await nav.getByRole("button",{name:menu,exact:true}).click();
    await nav.getByRole("link",{name:label,exact:true}).click();
    await expect(page.getByRole("heading",{name:title,exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  const toggle=nav.getByRole("button",{name:"T-Shirts",exact:true});
  await toggle.focus();await page.keyboard.press("Enter");await expect(toggle).toHaveAttribute("aria-expanded","true");
  await page.keyboard.press("Escape");await expect(toggle).toHaveAttribute("aria-expanded","false");await expect(toggle).toBeFocused();
  await nav.getByRole("button",{name:"Jerseys",exact:true}).click();
  await nav.getByRole("link",{name:"All Jerseys",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Jerseys",exact:true})).toBeVisible();
  for(const name of ["Beanies","Hats","Sweatshirts","Equipment"]){
    await nav.getByRole("link",{name,exact:true}).click();
    await expect(page.getByRole("heading",{name,exact:true})).toBeVisible();
  }
});
