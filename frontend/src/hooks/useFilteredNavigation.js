import { useMemo } from "react";
import { sections as allSections } from "../navigation";
import { ROLE_ALLOWED_PREFIXES, VALID_ROLES } from "../config/roles";

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

function filterNavItem(item, role) {
  if (!item) return null;

  // Leaf: has href
  if (item.href) {
    return isAllowedPathForRole(item.href, role) ? item : null;
  }

  // Parent: has children
  if (item.children) {
    const filteredChildren = item.children
      .map((child) => filterNavItem(child, role))
      .filter(Boolean);

    if (filteredChildren.length === 0) return null;
    return { ...item, children: filteredChildren };
  }

  return item;
}

export default function useFilteredNavigation(role) {
  return useMemo(() => {
    if (!role || !VALID_ROLES.includes(role)) return allSections;

    const excludedTitles = SECTION_EXCLUSIONS[role] || [];

    return allSections
      .map((section) => {
        if (excludedTitles.includes(section.title)) return null;

        const filteredItems = section.items
          .map((item) => filterNavItem(item, role))
          .filter(Boolean);

        if (filteredItems.length === 0) return null;
        return { ...section, items: filteredItems };
      })
      .filter(Boolean);
  }, [role]);
}

