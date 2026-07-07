import { useMemo } from "react";
import { sections as allSections } from "../navigation";
import { ROLE_ALLOWED_PREFIXES, VALID_ROLES, PRODUCT_ALLOWED_PREFIXES, PRODUCTS } from "../config/roles";

// Sections to completely hide for specific roles (by title)
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

function isAllowedPathForProduct(pathname, product) {
  if (product === PRODUCTS.ALL) return true;
  const prefixes = PRODUCT_ALLOWED_PREFIXES[product] ?? [];
  return prefixes.some((prefix) => {
    if (prefix === "/") return pathname === "/";
    return pathname === prefix || pathname.startsWith(prefix);
  });
}

function filterNavItem(item, role, product) {
  if (!item) return null;

  // Leaf: has href
  if (item.href) {
    const roleOk = isAllowedPathForRole(item.href, role);
    const productOk = isAllowedPathForProduct(item.href, product);
    return roleOk && productOk ? item : null;
  }

  // Parent: has children
  if (item.children) {
    const filteredChildren = item.children
      .map((child) => filterNavItem(child, role, product))
      .filter(Boolean);

    if (filteredChildren.length === 0) return null;
    return { ...item, children: filteredChildren };
  }

  return item;
}

export default function useFilteredNavigation(role, product = PRODUCTS.ALL) {
  return useMemo(() => {
    if (!role || !VALID_ROLES.includes(role)) return allSections;

    const excludedTitles = SECTION_EXCLUSIONS[role] || [];

    return allSections
      .map((section) => {
        if (excludedTitles.includes(section.title)) return null;

        const filteredItems = section.items
          .map((item) => filterNavItem(item, role, product))
          .filter(Boolean);

        if (filteredItems.length === 0) return null;
        return { ...section, items: filteredItems };
      })
      .filter(Boolean);
  }, [role, product]);
}

