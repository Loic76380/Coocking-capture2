"""
Test P1 Features:
- Public recipes sidebar API
- Recipe visibility toggle (is_public)
- Contact form API
- Admin RGPD functions (update user, export data, send data by email)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cookbook-app-8.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "demo@example.com"
TEST_USER_PASSWORD = "demopassword"
TEST_RECIPE_ID = "497b7fd0-23e2-441d-9b97-969d83e23595"


class TestPublicRecipesSidebar:
    """Test public recipes sidebar API - no auth required"""
    
    def test_get_public_recent_recipes(self):
        """GET /api/recipes/public/recent - should return public recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes/public/recent")
        assert response.status_code == 200
        
        data = response.json()
        assert "recipes" in data
        assert isinstance(data["recipes"], list)
        
        # Should have at least one public recipe (Tarte aux pommes)
        if len(data["recipes"]) > 0:
            recipe = data["recipes"][0]
            assert "id" in recipe
            assert "title" in recipe
            assert "user_name" in recipe
            assert "source_type" in recipe
            print(f"Found {len(data['recipes'])} public recipes")
            print(f"First recipe: {recipe['title']} by {recipe['user_name']}")
    
    def test_public_recipes_no_auth_required(self):
        """Public recipes endpoint should not require authentication"""
        response = requests.get(f"{BASE_URL}/api/recipes/public/recent")
        assert response.status_code == 200
        # Should not return 401 or 403


class TestRecipeVisibilityToggle:
    """Test recipe visibility toggle (is_public field)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_toggle_recipe_public(self, auth_token):
        """PUT /api/recipes/{id} with is_public should update visibility"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First, get current state
        response = requests.get(f"{BASE_URL}/api/recipes/{TEST_RECIPE_ID}", headers=headers)
        if response.status_code == 404:
            pytest.skip("Test recipe not found")
        assert response.status_code == 200
        
        current_state = response.json().get("is_public", False)
        print(f"Current is_public state: {current_state}")
        
        # Toggle to opposite state
        new_state = not current_state
        response = requests.put(
            f"{BASE_URL}/api/recipes/{TEST_RECIPE_ID}",
            headers=headers,
            json={"is_public": new_state}
        )
        assert response.status_code == 200
        
        # Verify the change
        data = response.json()
        assert data.get("is_public") == new_state
        print(f"Successfully toggled is_public to: {new_state}")
        
        # Toggle back to original state
        response = requests.put(
            f"{BASE_URL}/api/recipes/{TEST_RECIPE_ID}",
            headers=headers,
            json={"is_public": current_state}
        )
        assert response.status_code == 200
    
    def test_public_recipe_appears_in_sidebar(self, auth_token):
        """When is_public=True, recipe should appear in public/recent"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Set recipe to public
        response = requests.put(
            f"{BASE_URL}/api/recipes/{TEST_RECIPE_ID}",
            headers=headers,
            json={"is_public": True}
        )
        assert response.status_code == 200
        
        # Check public recipes
        response = requests.get(f"{BASE_URL}/api/recipes/public/recent")
        assert response.status_code == 200
        
        recipes = response.json().get("recipes", [])
        recipe_ids = [r["id"] for r in recipes]
        assert TEST_RECIPE_ID in recipe_ids, "Public recipe should appear in sidebar"
        print(f"Recipe {TEST_RECIPE_ID} found in public sidebar")


class TestContactForm:
    """Test contact form API"""
    
    def test_send_contact_message(self):
        """POST /api/contact - should send contact message to admin"""
        response = requests.post(f"{BASE_URL}/api/contact", json={
            "name": "Test User",
            "email": "test@example.com",
            "subject": "Test Subject",
            "message": "This is a test message from automated testing."
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "success"
        print(f"Contact message sent successfully: {data.get('message')}")
    
    def test_contact_without_subject(self):
        """Contact form should work without subject (optional field)"""
        response = requests.post(f"{BASE_URL}/api/contact", json={
            "name": "Test User",
            "email": "test@example.com",
            "message": "Message without subject"
        })
        assert response.status_code == 200
    
    def test_contact_missing_required_fields(self):
        """Contact form should fail without required fields"""
        # Missing name
        response = requests.post(f"{BASE_URL}/api/contact", json={
            "email": "test@example.com",
            "message": "Test message"
        })
        assert response.status_code == 422  # Validation error
        
        # Missing email
        response = requests.post(f"{BASE_URL}/api/contact", json={
            "name": "Test User",
            "message": "Test message"
        })
        assert response.status_code == 422
        
        # Missing message
        response = requests.post(f"{BASE_URL}/api/contact", json={
            "name": "Test User",
            "email": "test@example.com"
        })
        assert response.status_code == 422


class TestAdminRGPDFunctions:
    """Test Admin RGPD functions - requires admin authentication"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token - admin email is loicchampanay@gmail.com"""
        # Note: Admin access requires the hardcoded admin email
        # For testing, we'll use the demo user and expect 403 for admin routes
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_admin_stats_requires_admin(self, admin_token):
        """GET /api/admin/stats - should require admin access"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        # Demo user is not admin, should get 403
        assert response.status_code == 403
        print("Admin stats correctly requires admin access")
    
    def test_admin_users_requires_admin(self, admin_token):
        """GET /api/admin/users - should require admin access"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 403
        print("Admin users list correctly requires admin access")
    
    def test_admin_update_user_requires_admin(self, admin_token):
        """PUT /api/admin/users/{id} - should require admin access"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(
            f"{BASE_URL}/api/admin/users/some-user-id",
            headers=headers,
            json={"name": "New Name"}
        )
        assert response.status_code == 403
        print("Admin update user correctly requires admin access")
    
    def test_admin_export_user_requires_admin(self, admin_token):
        """GET /api/admin/users/{id}/export - should require admin access"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/admin/users/some-user-id/export",
            headers=headers
        )
        assert response.status_code == 403
        print("Admin export user data correctly requires admin access")
    
    def test_admin_send_data_requires_admin(self, admin_token):
        """POST /api/admin/users/{id}/send-data - should require admin access"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/admin/users/some-user-id/send-data",
            headers=headers
        )
        assert response.status_code == 403
        print("Admin send user data correctly requires admin access")


class TestAdminEndpointsExist:
    """Verify admin endpoints exist (without admin auth)"""
    
    def test_admin_stats_endpoint_exists(self):
        """Admin stats endpoint should exist (returns 403 without auth)"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        # Should return 403 (forbidden) not 404 (not found)
        assert response.status_code in [401, 403]
        print("Admin stats endpoint exists")
    
    def test_admin_users_endpoint_exists(self):
        """Admin users endpoint should exist"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code in [401, 403]
        print("Admin users endpoint exists")
    
    def test_admin_update_user_endpoint_exists(self):
        """Admin update user endpoint should exist"""
        response = requests.put(f"{BASE_URL}/api/admin/users/test-id", json={"name": "test"})
        assert response.status_code in [401, 403]
        print("Admin update user endpoint exists")
    
    def test_admin_export_endpoint_exists(self):
        """Admin export user data endpoint should exist"""
        response = requests.get(f"{BASE_URL}/api/admin/users/test-id/export")
        assert response.status_code in [401, 403]
        print("Admin export endpoint exists")
    
    def test_admin_send_data_endpoint_exists(self):
        """Admin send user data endpoint should exist"""
        response = requests.post(f"{BASE_URL}/api/admin/users/test-id/send-data")
        assert response.status_code in [401, 403]
        print("Admin send data endpoint exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
