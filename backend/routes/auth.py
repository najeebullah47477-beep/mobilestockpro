from flask import request, jsonify
from extensions import db, jwt
from models.user import User
from schemas.user_schema import RegisterSchema, LoginSchema, ChangePasswordSchema
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from utils import role_required
from routes import auth_bp


@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        schema = RegisterSchema()
        errors = schema.validate(request.get_json())
        if errors:
            return jsonify({'success': False, 'data': None, 'message': errors}), 400

        data = schema.load(request.get_json())
        existing = User.query.filter(
            (User.username == data['username']) | (User.email == data['email'])
        ).first()
        if existing:
            return jsonify({'success': False, 'data': None, 'message': 'Username or email already exists'}), 409

        user = User(
            username=data['username'],
            email=data['email'],
            password_hash=generate_password_hash(data['password']),
            role=data.get('role', 'staff'),
            is_active=True
        )
        db.session.add(user)
        db.session.commit()

        return jsonify({'success': True, 'data': user.to_dict(), 'message': 'User registered successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        schema = LoginSchema()
        errors = schema.validate(request.get_json())
        if errors:
            return jsonify({'success': False, 'data': None, 'message': errors}), 400

        data = schema.load(request.get_json())
        user = User.query.filter_by(username=data['username']).first()

        if not user or not check_password_hash(user.password_hash, data['password']):
            return jsonify({'success': False, 'data': None, 'message': 'Invalid username or password'}), 401

        if not user.is_active:
            return jsonify({'success': False, 'data': None, 'message': 'Account is deactivated'}), 401

        user.last_login = db.func.now()
        db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={'role': user.role}
        )

        return jsonify({
            'success': True,
            'data': {
                'token': access_token,
                'user': user.to_dict()
            },
            'message': 'Login successful'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'data': None, 'message': 'User not found'}), 404

        return jsonify({'success': True, 'data': user.to_dict(), 'message': 'User retrieved successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@auth_bp.route('/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'data': None, 'message': 'User not found'}), 404

        schema = ChangePasswordSchema()
        errors = schema.validate(request.get_json())
        if errors:
            return jsonify({'success': False, 'data': None, 'message': errors}), 400

        data = schema.load(request.get_json())

        if not check_password_hash(user.password_hash, data['old_password']):
            return jsonify({'success': False, 'data': None, 'message': 'Current password is incorrect'}), 400

        user.password_hash = generate_password_hash(data['new_password'])
        db.session.commit()

        return jsonify({'success': True, 'data': None, 'message': 'Password changed successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@auth_bp.route('/users', methods=['GET'])
@jwt_required()
@role_required('admin')
def list_users():
    try:
        users = User.query.order_by(User.created_at.desc()).all()
        return jsonify({'success': True, 'data': [u.to_dict() for u in users], 'message': 'Users retrieved successfully'}), 200
    except Exception as e:
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@auth_bp.route('/users', methods=['POST'])
@jwt_required()
@role_required('admin')
def create_user():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'data': None, 'message': 'No data provided'}), 400

        full_name = data.get('full_name', '').strip()
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        role = data.get('role', 'staff')

        if not full_name or not username or not email or not password:
            return jsonify({'success': False, 'data': None, 'message': 'full_name, username, email, and password are required'}), 400

        existing = User.query.filter((User.username == username) | (User.email == email)).first()
        if existing:
            return jsonify({'success': False, 'data': None, 'message': 'Username or email already exists'}), 409

        user = User(
            full_name=full_name,
            username=username,
            email=email,
            password_hash=generate_password_hash(password),
            role=role,
            is_active=True
        )
        db.session.add(user)
        db.session.commit()

        return jsonify({'success': True, 'data': user.to_dict(), 'message': 'User created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@auth_bp.route('/users/<int:id>', methods=['PUT'])
@jwt_required()
@role_required('admin')
def update_user(id):
    try:
        user = User.query.get(id)
        if not user:
            return jsonify({'success': False, 'data': None, 'message': 'User not found'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'data': None, 'message': 'No data provided'}), 400

        if 'full_name' in data and data['full_name']:
            user.full_name = data['full_name'].strip()
        if 'email' in data and data['email']:
            user.email = data['email'].strip()
        if 'role' in data:
            user.role = data['role']
        if 'is_active' in data:
            user.is_active = data['is_active']

        db.session.commit()
        return jsonify({'success': True, 'data': user.to_dict(), 'message': 'User updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@auth_bp.route('/users/<int:id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def deactivate_user(id):
    try:
        user = User.query.get(id)
        if not user:
            return jsonify({'success': False, 'data': None, 'message': 'User not found'}), 404

        user.is_active = False
        db.session.commit()
        return jsonify({'success': True, 'data': None, 'message': 'User deactivated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500


@auth_bp.route('/check-email', methods=['GET'])
@jwt_required()
def check_email():
    try:
        email = request.args.get('email', '').strip().lower()
        exclude_id = request.args.get('exclude_id', type=int)
        if not email:
            return jsonify({'available': False, 'message': 'Email parameter required'}), 400
        query = User.query.filter(User.email == email)
        if exclude_id:
            query = query.filter(User.id != exclude_id)
        exists = query.first() is not None
        return jsonify({'available': not exists}), 200
    except Exception as e:
        return jsonify({'available': False, 'message': str(e)}), 500


@auth_bp.route('/check-username', methods=['GET'])
@jwt_required()
def check_username():
    try:
        username = request.args.get('username', '').strip().lower()
        exclude_id = request.args.get('exclude_id', type=int)
        if not username:
            return jsonify({'available': False, 'message': 'Username parameter required'}), 400
        query = User.query.filter(User.username == username)
        if exclude_id:
            query = query.filter(User.id != exclude_id)
        exists = query.first() is not None
        return jsonify({'available': not exists}), 200
    except Exception as e:
        return jsonify({'available': False, 'message': str(e)}), 500


@auth_bp.route('/users/<int:id>/reset-password', methods=['PUT'])
@jwt_required()
@role_required('admin')
def reset_user_password(id):
    try:
        user = User.query.get(id)
        if not user:
            return jsonify({'success': False, 'data': None, 'message': 'User not found'}), 404

        data = request.get_json()
        if not data or not data.get('new_password'):
            return jsonify({'success': False, 'data': None, 'message': 'new_password is required'}), 400

        user.password_hash = generate_password_hash(data['new_password'])
        db.session.commit()
        return jsonify({'success': True, 'data': None, 'message': 'Password reset successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'data': None, 'message': str(e)}), 500
