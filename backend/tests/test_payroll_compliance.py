from pathlib import Path


def test_compliance_document_upload_and_list(client, auth_header, tmp_path):
    file_path = tmp_path / "notice.txt"
    file_path.write_text(
        "PF 12% and ESI 0.75% and Professional Tax ₹200. Due by 31st March.",
        encoding="utf-8",
    )

    with file_path.open("rb") as handle:
        upload_resp = client.post(
            "/api/payroll/compliance/documents",
            headers=auth_header,
            files={"file": ("notice.txt", handle, "text/plain")},
            data={"title": "Test compliance notice", "country": "IN", "category": "other"},
        )

    assert upload_resp.status_code == 201, upload_resp.text
    payload = upload_resp.json()
    assert payload["title"] == "Test compliance notice"
    assert payload["country"] == "IN"
    assert payload["status"] in {"parsed", "processing", "failed"}

    list_resp = client.get(
        "/api/payroll/compliance/documents",
        headers=auth_header,
        params={"country": "IN"},
    )

    assert list_resp.status_code == 200, list_resp.text
    rows = list_resp.json()
    assert any(row["id"] == payload["id"] for row in rows)
