import { useMemo } from "react";
import { sections as allSections } from "../navigation";
import { ROLE_ALLOWED_PREFIXES, VALID_ROLES, PRODUCT_ALLOWED_PREFIXES, PRODUCTS, ROLES } from "../config/roles";

const SECTION_EXCLUSIONS = {
  super_admin: ["HR ADMIN", "PRODUCTS"],
};

function isAllowedPathForRole(pathname, role) {
  if (!role || !VALID_ROLES.includes(role)) return false;
  const prefixes = ROLE_ALLOWED_PREFIXES[role] ?? [];
  return prefixes.some((prefix) => {
    if (prefix === "/") return pathname === "/";
    return pathname === prefix || pathname.startsWith(prefix);
  });
}

const BADGE_TO_PRODUCT = {
  HR: PRODUCTS.HR,
  Time: PRODUCTS.TIME,
  Payroll: PRODUCTS.PAYROLL,
  Billing: PRODUCTS.BILLING,
  Projects: PRODUCTS.PROJECTS,
  Comply: PRODUCTS.COMPLY,
  Insights: PRODUCTS.INSIGHTS,
  Spend: PRODUCTS.SPEND,
  Inventory: PRODUCTS.INVENTORY,
  Docs: PRODUCTS.DOCS,
};

function isAllowedPathForProducts(pathname, products) {
  if (!products || products.length === 0) return true;
  return products.some((code) => {
    const prefixes = PRODUCT_ALLOWED_PREFIXES[code] ?? [];
    return prefixes.some((prefix) => {
      if (prefix === "/") return pathname === "/";
      return pathname === prefix || pathname.startsWith(prefix);
    });
  });
}

function filterNavItem(item, role, products) {
  if (!item) return null;

  const hasProducts = Array.isArray(products) && products.length > 0;

  if (item.badge && hasProducts) {
    const badgeProduct = BADGE_TO_PRODUCT[item.badge];
    if (badgeProduct && !products.includes(badgeProduct)) return null;
  }

  if (item.href) {
    const roleOk = isAllowedPathForRole(item.href, role);
    const productOk = isAllowedPathForProducts(item.href, products);
    return roleOk && productOk ? item : null;
  }

  if (item.children) {
    const filteredChildren = item.children
      .map((child) => filterNavItem(child, role, products))
      .filter(Boolean);

    if (filteredChildren.length === 0) return null;
    return { ...item, children: filteredChildren };
  }

  return item;
}

export default function useFilteredNavigation(role, product, products = []) {
  return useMemo(() => {
    if (!role || !VALID_ROLES.includes(role)) return allSections;
    if (role === ROLES.SUPER_ADMIN) return allSections;

    const excludedTitles = SECTION_EXCLUSIONS[role] || [];

    return allSections
      .map((section) => {
        if (excludedTitles.includes(section.title)) return null;

        const filteredItems = section.items
          .map((item) => filterNavItem(item, role, products))
          .filter(Boolean);

        if (filteredItems.length === 0) return null;
        return { ...section, items: filteredItems };
      })
      .filter(Boolean);
  }, [role, products]);
}
