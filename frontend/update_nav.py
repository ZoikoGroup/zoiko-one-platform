import os
import re

dir_path = r"d:\Nikhil\ZoikOne\Zoiko_One-frontend\src\modules\zoiko-hr\onboarding"
new_nav_items = """const NAV_ITEMS = [
  { label: "Dashboard", href: "/zoiko-hr/onboarding" },
  { label: "New Hires", href: "/zoiko-hr/onboarding/new-hires" },
  { label: "Pre-Onboarding", href: "/zoiko-hr/onboarding/pre-onboarding" },
  { label: "Documents", href: "/zoiko-hr/onboarding/documents" },
  { label: "Checklists", href: "/zoiko-hr/onboarding/checklists" },
  { label: "Orientation", href: "/zoiko-hr/onboarding/orientation" },
  { label: "Reports", href: "/zoiko-hr/onboarding/reports" },
  { label: "Settings", href: "/zoiko-hr/onboarding/settings" },
];"""

for file in os.listdir(dir_path):
    if file.endswith(".jsx"):
        file_path = os.path.join(dir_path, file)
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Replace the NAV_ITEMS array using regex
        updated = re.sub(r"const NAV_ITEMS = \[.*?\];", new_nav_items, content, flags=re.DOTALL)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(updated)
print("Updated NAV_ITEMS in all jsx files")
