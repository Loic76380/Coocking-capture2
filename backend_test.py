#!/usr/bin/env python3
"""
Backend API Testing for Recipe Capture App with Authentication
Tests all endpoints: auth, filters, recipes with user privacy
"""

import requests
import sys
import json
from datetime import datetime
import time
import uuid

class RecipeAPITester:
    def __init__(self, base_url="https://cooking-capture.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_recipe_id = None
        self.auth_token = None
        self.user_id = None
        self.test_user_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        self.test_user_password = "test123"
        self.test_user_name = "Test User"
        self.custom_filter_id = None

    def get_headers(self):
        """Get headers with auth token if available"""
        headers = {'Content-Type': 'application/json'}
        if self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'
        return headers

    def test_user_registration(self):
        """Test user registration"""
        try:
            response = requests.post(
                f"{self.api_url}/auth/register",
                json={
                    "email": self.test_user_email,
                    "password": self.test_user_password,
                    "name": self.test_user_name
                },
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.auth_token = data.get('token')
                self.user_id = data.get('user', {}).get('id')
                details += f", User ID: {self.user_id}, Token received: {bool(self.auth_token)}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Raw response: {response.text[:200]}"
            
            self.log_test("User Registration", success, details)
            return success
            
        except Exception as e:
            self.log_test("User Registration", False, str(e))
            return False

    def test_user_login(self):
        """Test user login"""
        try:
            response = requests.post(
                f"{self.api_url}/auth/login",
                json={
                    "email": self.test_user_email,
                    "password": self.test_user_password
                },
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                token = data.get('token')
                user = data.get('user', {})
                details += f", User: {user.get('name')}, Email: {user.get('email')}"
                # Verify token matches registration token
                if token == self.auth_token:
                    details += ", Token matches registration"
                else:
                    details += ", New token received"
                    self.auth_token = token
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Raw response: {response.text[:200]}"
            
            self.log_test("User Login", success, details)
            return success
            
        except Exception as e:
            self.log_test("User Login", False, str(e))
            return False

    def test_get_current_user(self):
        """Test getting current user info"""
        try:
            response = requests.get(
                f"{self.api_url}/auth/me",
                headers=self.get_headers(),
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", User: {data.get('name')}, Email: {data.get('email')}"
                details += f", Custom filters: {len(data.get('custom_filters', []))}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Raw response: {response.text[:200]}"
            
            self.log_test("Get Current User", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Current User", False, str(e))
            return False

    def test_get_filters(self):
        """Test getting all filters (default + custom)"""
        try:
            response = requests.get(
                f"{self.api_url}/filters",
                headers=self.get_headers(),
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                default_filters = data.get('default_filters', [])
                custom_filters = data.get('custom_filters', [])
                details += f", Default filters: {len(default_filters)}, Custom filters: {len(custom_filters)}"
                
                # Verify default filters exist
                expected_defaults = ['apero', 'entrees', 'plats', 'desserts', 'sale', 'sucre', 'viande', 'poisson']
                found_defaults = [f['id'] for f in default_filters]
                missing = [f for f in expected_defaults if f not in found_defaults]
                if missing:
                    details += f", Missing default filters: {missing}"
                else:
                    details += ", All default filters present"
            
            self.log_test("Get Filters", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Filters", False, str(e))
            return False

    def test_create_custom_filter(self):
        """Test creating a custom filter"""
        try:
            response = requests.post(
                f"{self.api_url}/filters",
                json={
                    "name": "Test Filter",
                    "color": "#FF5733"
                },
                headers=self.get_headers(),
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.custom_filter_id = data.get('id')
                details += f", Filter ID: {self.custom_filter_id}, Name: {data.get('name')}"
                details += f", Color: {data.get('color')}, Row: {data.get('row')}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Raw response: {response.text[:200]}"
            
            self.log_test("Create Custom Filter", success, details)
            return success
            
        except Exception as e:
            self.log_test("Create Custom Filter", False, str(e))
            return False

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def test_recipe_extraction_authenticated(self):
        """Test recipe extraction with authentication"""
        test_url = "https://www.marmiton.org/recettes/recette_fondant-au-chocolat_16951.aspx"
        
        try:
            print(f"🔍 Testing authenticated recipe extraction with URL: {test_url}")
            response = requests.post(
                f"{self.api_url}/recipes/extract",
                json={"url": test_url},
                headers=self.get_headers(),
                timeout=60  # AI extraction can take time
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.created_recipe_id = data.get('id')
                details += f", Recipe ID: {self.created_recipe_id}, Title: {data.get('title', 'N/A')}"
                details += f", User ID: {data.get('user_id')}, Ingredients: {len(data.get('ingredients', []))}"
                details += f", Steps: {len(data.get('steps', []))}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Raw response: {response.text[:200]}"
            
            self.log_test("Authenticated Recipe Extraction", success, details)
            return success
            
        except Exception as e:
            self.log_test("Authenticated Recipe Extraction", False, str(e))
            return False

    def test_get_user_recipes(self):
        """Test getting user's private recipes"""
        try:
            response = requests.get(
                f"{self.api_url}/recipes",
                headers=self.get_headers(),
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Recipe count: {len(data)}"
                # Verify all recipes belong to current user
                if data:
                    user_ids = [recipe.get('user_id') for recipe in data]
                    if all(uid == self.user_id for uid in user_ids):
                        details += ", All recipes belong to current user"
                    else:
                        details += ", WARNING: Found recipes from other users"
                        success = False
            
            self.log_test("Get User Recipes (Privacy)", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get User Recipes (Privacy)", False, str(e))
            return False

    def test_update_recipe_tags(self):
        """Test updating recipe tags"""
        if not self.created_recipe_id:
            self.log_test("Update Recipe Tags", False, "No recipe ID available")
            return False
            
        try:
            # Use some default filter IDs and custom filter if created
            tags = ["apero", "sale"]
            if self.custom_filter_id:
                tags.append(self.custom_filter_id)
                
            response = requests.put(
                f"{self.api_url}/recipes/{self.created_recipe_id}",
                json={"tags": tags},
                headers=self.get_headers(),
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                updated_tags = data.get('tags', [])
                details += f", Updated tags: {updated_tags}, Count: {len(updated_tags)}"
                # Verify tags were actually updated
                if set(updated_tags) == set(tags):
                    details += ", Tags correctly updated"
                else:
                    details += f", Tag mismatch - expected: {tags}, got: {updated_tags}"
            
            self.log_test("Update Recipe Tags", success, details)
            return success
            
        except Exception as e:
            self.log_test("Update Recipe Tags", False, str(e))
            return False

    def test_delete_custom_filter(self):
        """Test deleting a custom filter"""
        if not self.custom_filter_id:
            self.log_test("Delete Custom Filter", False, "No custom filter ID available")
            return False
            
        try:
            response = requests.delete(
                f"{self.api_url}/filters/{self.custom_filter_id}",
                headers=self.get_headers(),
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'N/A')}"
            
            self.log_test("Delete Custom Filter", success, details)
            return success
            
        except Exception as e:
            self.log_test("Delete Custom Filter", False, str(e))
            return False

    def test_unauthorized_access(self):
        """Test that endpoints require authentication"""
        try:
            # Test without auth token
            response = requests.get(f"{self.api_url}/recipes", timeout=10)
            
            success = response.status_code in [401, 403, 422]
            details = f"Status: {response.status_code} (expected 401/403/422)"
            
            self.log_test("Unauthorized Access Protection", success, details)
            return success
            
        except Exception as e:
            self.log_test("Unauthorized Access Protection", False, str(e))
            return False

    def test_root_endpoint(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Response: {data}"
            self.log_test("API Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("API Root Endpoint", False, str(e))
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests (Authentication & Filters)")
        print(f"📍 Testing against: {self.base_url}")
        print(f"👤 Test user: {self.test_user_email}")
        print("=" * 60)
        
        # Test in logical order
        self.test_root_endpoint()
        
        # Authentication tests
        self.test_user_registration()
        self.test_user_login()
        self.test_get_current_user()
        
        # Authorization test
        self.test_unauthorized_access()
        
        # Filter tests
        self.test_get_filters()
        self.test_create_custom_filter()
        
        # Recipe tests (authenticated)
        self.test_recipe_extraction_authenticated()
        self.test_get_user_recipes()
        self.test_update_recipe_tags()
        
        # Cleanup tests
        self.test_delete_custom_filter()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Backend Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All backend tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} test(s) failed")
            return False

def main():
    tester = RecipeAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0,
        "test_details": tester.test_results
    }
    
    with open("/app/backend_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())